---
title: coroutine 与 sylar 协程实现设计分析
description: 对 cloudwu/coroutine 与 sylar-yin/sylar 中协程实现的架构、实现思路和关键函数进行整理。
date: 2026-06-11
tags:
  - coroutine
  - ucontext
  - C/C++
categories:
  - 源码分析
---

# coroutine 与 sylar 协程实现设计分析

本文整理两个开源项目中的协程实现：

* [cloudwu/coroutine](https://github.com/cloudwu/coroutine)：一个极简 C 语言共享栈协程库。
* [sylar-yin/sylar](https://github.com/sylar-yin/sylar)：一个 C++ 服务器框架中的协程、调度器与 IO 协程调度模块。

两个项目都基于 `ucontext` 系列 API 完成用户态上下文切换，但设计目标不同：`coroutine` 追求最小实现与共享栈；`sylar` 将协程作为服务器运行时的基础设施，进一步提供 N-M 调度、IO 事件驱动和 hook 支持。

## 一、cloudwu/coroutine

### 1. 设计架构

`coroutine` 的核心由两个结构组成：

* `schedule`：调度器，管理一个线程内的所有协程。
* `coroutine`：单个协程对象，保存执行函数、用户参数、上下文和私有保存栈。

核心数据结构位于 `coroutine/coroutine.c`：

```c
struct schedule {
    char stack[STACK_SIZE];
    ucontext_t main;
    int nco;
    int cap;
    int running;
    struct coroutine **co;
};

struct coroutine {
    coroutine_func func;
    void *ud;
    ucontext_t ctx;
    struct schedule * sch;
    ptrdiff_t cap;
    ptrdiff_t size;
    int status;
    char *stack;
};
```

架构特点：

* 单线程调度：一个 `schedule` 只允许同时运行一个协程，`running` 记录当前协程 id。
* 协作式切换：协程只有主动调用 `coroutine_yield` 才会让出执行权。
* 共享运行栈：`schedule.stack` 是所有协程运行时共用的 1MB 栈。
* 私有保存栈：协程挂起时只把当前实际使用的栈片段复制到 `coroutine.stack`。
* 状态机简单：`DEAD -> READY -> RUNNING -> SUSPEND -> RUNNING -> DEAD`。

### 2. 实现思路

该项目最有代表性的设计是“共享栈协程”。所有协程运行时都使用 `schedule.stack`，因此不需要为每个协程长期分配完整栈空间。协程让出时，库会计算当前栈帧到共享栈顶部之间的有效内容，并复制到协程自己的堆内存；恢复时再复制回共享栈。

执行流程：

1. `coroutine_open` 创建调度器，初始化共享栈、协程数组和运行状态。
2. `coroutine_new` 创建协程对象，放入调度器数组，返回协程 id。
3. `coroutine_resume` 第一次恢复协程时创建 `ucontext_t`，设置栈为共享栈，并通过 `makecontext` 进入 `mainfunc`。
4. 协程函数执行期间可调用 `coroutine_yield`，保存共享栈上的有效数据，然后 `swapcontext` 回主上下文。
5. 再次 `resume` 时，把保存的栈数据复制回共享栈，并切换回协程上下文。
6. 协程函数结束后，`mainfunc` 释放协程对象并将数组槽位置空。

### 3. 关键函数解析

#### `coroutine_open`

职责：创建调度器。

关键点：

* `running = -1` 表示当前没有协程运行。
* 初始容量为 `DEFAULT_COROUTINE`。
* `co` 是协程指针数组，后续按 id 索引协程。

#### `coroutine_new`

职责：创建一个新协程并返回 id。

实现逻辑：

* 通过 `_co_new` 分配并初始化 `coroutine`。
* 如果当前协程数量达到容量上限，则将数组扩容为 2 倍。
* 否则在数组中寻找空槽位保存协程。

这个设计让协程 id 可以复用，协程结束后对应槽位会被置空。

#### `coroutine_resume`

职责：恢复指定协程执行。

分两种情况：

* `COROUTINE_READY`：第一次运行。
  * `getcontext(&C->ctx)` 初始化上下文。
  * `C->ctx.uc_stack` 指向调度器的共享栈。
  * `C->ctx.uc_link = &S->main`，协程函数自然返回时可回到主上下文。
  * `makecontext` 设置入口函数为 `mainfunc`。
  * `swapcontext(&S->main, &C->ctx)` 从主上下文切到协程。
* `COROUTINE_SUSPEND`：从挂起状态恢复。
  * 将 `C->stack` 中保存的栈片段复制回共享栈尾部。
  * 再通过 `swapcontext` 切入协程上下文。

#### `_save_stack`

职责：保存协程当前使用的栈内容。

关键实现：

```c
char dummy = 0;
assert(top - &dummy <= STACK_SIZE);
C->size = top - &dummy;
memcpy(C->stack, &dummy, C->size);
```

`dummy` 是当前函数栈上的局部变量，它的位置可近似代表当前栈顶。由于常见平台栈向低地址增长，`top` 是共享栈高地址端，`top - &dummy` 就是当前实际使用的栈大小。

#### `coroutine_yield`

职责：当前协程主动让出执行权。

核心步骤：

* 找到当前运行协程。
* 调用 `_save_stack` 保存有效栈片段。
* 将状态设置为 `COROUTINE_SUSPEND`。
* `running` 重置为 `-1`。
* `swapcontext(&C->ctx, &S->main)` 切回主上下文。

#### `mainfunc`

职责：作为所有新协程的统一入口。

它从 `schedule.running` 找到当前协程，调用用户函数 `C->func(S, C->ud)`。用户函数返回后，表示协程生命周期结束，于是释放协程、清空数组槽位、减少协程计数并重置 `running`。

### 4. 优缺点

优点：

* 实现极小，便于理解协程本质。
* 共享栈显著降低大量协程的内存占用。
* API 简单，适合嵌入式学习或轻量场景。

局限：

* 单线程调度，没有调度队列、IO 等待、定时器等能力。
* 共享栈需要频繁拷贝，协程栈内容较大时有额外成本。
* 依赖 `ucontext`，该 API 在部分平台上已被标记为过时。
* 不能在协程间直接共享运行栈上的指针，否则 yield 后可能失效。

## 二、sylar 协程体系

### 1. 设计架构

`sylar` 的协程体系由三层组成：

* `Fiber`：协程抽象，封装 `ucontext_t`、独立栈、状态机和上下文切换。
* `Scheduler`：协程调度器，维护线程池和任务队列，实现 N-M 协程调度。
* `IOManager`：基于 `epoll` 的 IO 协程调度器，将 fd 事件、定时器和协程调度结合。

相关文件：

* `sylar/fiber.h`、`sylar/fiber.cc`
* `sylar/scheduler.h`、`sylar/scheduler.cc`
* `sylar/iomanager.h`、`sylar/iomanager.cc`
* `sylar/hook.h`、`sylar/hook.cc`

整体关系：

```text
业务函数 / Fiber
        |
        v
Scheduler 维护任务队列 + 工作线程
        |
        v
IOManager 在 idle fiber 中 epoll_wait
        |
        v
IO 事件触发后重新 schedule 对应 Fiber / callback
```

### 2. Fiber 层设计

`Fiber` 状态包括：

* `INIT`：初始化完成但尚未执行。
* `HOLD`：挂起，不自动进入可运行队列。
* `EXEC`：正在执行。
* `TERM`：执行结束。
* `READY`：可执行，等待调度。
* `EXCEPT`：执行异常。

与 `cloudwu/coroutine` 不同，`sylar` 的每个协程都有独立栈：

```cpp
m_stack = StackAllocator::Alloc(m_stacksize);
m_ctx.uc_stack.ss_sp = m_stack;
m_ctx.uc_stack.ss_size = m_stacksize;
```

因此切换时不需要复制栈，代价是每个协程会长期占用一段栈内存。

`sylar` 使用线程局部变量维护当前线程的协程状态：

* `t_fiber`：当前正在运行的协程。
* `t_threadFiber`：当前线程的主协程。
* `t_scheduler`：当前线程所属调度器。
* `t_scheduler_fiber`：当前线程的调度协程。

### 3. Scheduler 层设计

`Scheduler` 是 N-M 调度器：N 个线程调度 M 个协程/回调任务。

核心成员包括：

* `m_threads`：调度器创建的工作线程。
* `m_fibers`：待执行任务队列，元素可以是 `Fiber::ptr` 或 `std::function<void()>`。
* `m_threadIds`：工作线程 id 列表。
* `m_rootFiber`：当 `use_caller = true` 时，调用线程也作为调度线程，其调度入口被封装成 root fiber。
* `m_activeThreadCount` / `m_idleThreadCount`：活跃线程和空闲线程计数。

调度模型：

1. 外部调用 `schedule` 将协程或函数加入任务队列。
2. 如果有空闲线程，调用 `tickle` 唤醒调度器。
3. 工作线程执行 `Scheduler::run`，从队列取任务。
4. 如果是协程，调用 `swapIn` 运行。
5. 如果是函数，包装成临时协程后运行。
6. 协程主动 yield 后根据状态决定是否重新入队。
7. 没有任务时运行 `idle` 协程。

### 4. IOManager 层设计

`IOManager` 继承 `Scheduler` 和 `TimerManager`，在调度器基础上增加 IO 事件和定时器能力。

核心机制：

* 使用 `epoll_create` 创建 epoll 实例。
* 使用 pipe 作为 tickle 机制，向管道写入字节来唤醒阻塞在 `epoll_wait` 的 idle 线程。
* 每个 fd 对应一个 `FdContext`，分别保存 READ/WRITE 事件上下文。
* 事件上下文中保存触发后要恢复的 `Scheduler`、`Fiber` 或回调函数。
* `idle` 协程中执行 `epoll_wait`，事件到达后把对应协程重新加入调度队列。

`FdContext` 的关键结构：

```cpp
struct EventContext {
    Scheduler* scheduler = nullptr;
    Fiber::ptr fiber;
    std::function<void()> cb;
};

EventContext read;
EventContext write;
int fd = 0;
Event events = NONE;
```

### 5. 关键函数解析

#### `Fiber::Fiber()`

职责：创建当前线程的主协程。

特点：

* 主协程没有单独分配栈，使用线程原生调用栈。
* 构造时状态设置为 `EXEC`。
* `SetThis(this)` 将其设置为当前协程。

#### `Fiber::Fiber(std::function<void()> cb, ...)`

职责：创建普通业务协程。

关键步骤：

* 分配独立栈。
* `getcontext` 初始化上下文。
* 设置 `uc_stack` 指向独立栈。
* 根据 `use_caller` 选择入口：`MainFunc` 或 `CallerMainFunc`。

`use_caller` 用于支持调度器把调用线程也纳入调度。

#### `Fiber::swapIn` 与 `Fiber::swapOut`

职责：在调度协程和业务协程之间切换。

`swapIn`：

* 设置当前协程为 `this`。
* 状态改为 `EXEC`。
* 从 `Scheduler::GetMainFiber()` 切换到当前协程。

`swapOut`：

* 当前协程切回调度协程。
* 调度器随后根据协程状态决定是否重新调度。

#### `Fiber::YieldToReady` 与 `Fiber::YieldToHold`

职责：协程主动让出 CPU。

* `YieldToReady`：状态设置为 `READY`，表示让出后还希望继续被调度。
* `YieldToHold`：切出但不设为 `READY`，通常用于等待 IO、定时器或外部事件唤醒。

#### `Fiber::MainFunc`

职责：普通协程入口。

执行流程：

1. 获取当前协程。
2. 执行业务回调 `m_cb()`。
3. 正常结束则状态置为 `TERM`。
4. 捕获异常则状态置为 `EXCEPT`。
5. 清理回调，释放当前 shared_ptr 引用。
6. 调用 `swapOut` 回到调度协程。

#### `Scheduler::schedule`

职责：把协程或函数加入调度队列。

它通过模板同时支持 `Fiber::ptr` 和 `std::function<void()>`。入队时可指定线程 id，`thread = -1` 表示任意线程都可以执行。入队后如果之前队列为空，说明可能需要唤醒 idle 线程，于是调用 `tickle`。

#### `Scheduler::run`

职责：调度器主循环。

核心逻辑：

* 开启 hook：`set_hook_enable(true)`。
* 创建 `idle_fiber`。
* 循环从 `m_fibers` 中取可执行任务。
* 如果任务指定了其他线程，则跳过并 tickle 其他线程。
* 对 `Fiber` 调用 `swapIn`。
* 对 callback 复用或创建 `cb_fiber` 执行。
* 如果协程结束，不再调度。
* 如果状态是 `READY`，重新加入任务队列。
* 如果仍未结束但也不是 READY，则置为 `HOLD`。
* 没有任务时运行 `idle_fiber`。

这是 sylar 协程系统的调度核心。

#### `IOManager::addEvent`

职责：注册 fd 的 READ/WRITE 事件。

关键步骤：

* 根据 fd 找到或扩容 `FdContext`。
* 根据当前 fd 是否已有事件决定 `EPOLL_CTL_ADD` 或 `EPOLL_CTL_MOD`。
* 使用 `EPOLLET` 边缘触发模式注册事件。
* 保存当前调度器。
* 如果传入 callback，则保存 callback；否则保存当前协程 `Fiber::GetThis()`。
* 增加待处理事件计数。

当业务协程对 fd 等待事件时，它可以注册事件后 yield；事件到达后 IOManager 会重新调度该协程。

#### `IOManager::tickle`

职责：唤醒阻塞在 `epoll_wait` 的空闲调度线程。

实现方式是向 pipe 写入一个字节。pipe 的读端已经注册到 epoll，因此 `epoll_wait` 会立即返回。

#### `IOManager::idle`

职责：空闲协程主循环，承担 epoll 事件等待。

核心逻辑：

1. 判断调度器是否可以停止。
2. 根据最近定时器计算 `epoll_wait` 超时时间。
3. 等待 IO 事件或 tickle pipe。
4. 取出已过期定时器回调并加入调度队列。
5. 处理 epoll 返回事件。
6. 对 READ/WRITE 事件调用 `FdContext::triggerEvent`。
7. 当前 idle 协程 `swapOut`，让调度器继续执行被唤醒的任务。

#### `FdContext::triggerEvent`

职责：触发 fd 上的某个事件。

它会从当前事件集合中移除该事件，然后根据 `EventContext` 中保存的是 callback 还是 fiber，调用对应 scheduler 的 `schedule` 方法将其重新加入可运行队列。

### 6. sylar 的 hook 思路

`Scheduler::run` 中会调用 `set_hook_enable(true)`，说明在线程进入调度循环后启用 hook。`hook.cc` 通常用于拦截 `sleep`、`read`、`write`、`connect` 等阻塞系统调用，将它们改造成：

1. fd 设置为非阻塞。
2. 如果操作返回 `EAGAIN` 或需要等待，则向 `IOManager` 注册 READ/WRITE 事件。
3. 当前协程 yield。
4. IO 就绪或超时后恢复协程。
5. 再次尝试原系统调用。

这样业务层可以写接近同步阻塞的代码，但底层实际是协程挂起，不会阻塞整个线程。

## 三、两种实现的对比

| 维度 | cloudwu/coroutine | sylar |
| --- | --- | --- |
| 语言 | C | C++ |
| 栈模型 | 共享栈，yield 时复制有效栈 | 独立栈，每个 Fiber 单独分配 |
| 调度模型 | 单线程手动 resume/yield | N-M 调度器，线程池执行协程 |
| IO 支持 | 无 | epoll + Timer + hook |
| 状态数量 | READY/RUNNING/SUSPEND/DEAD | INIT/HOLD/EXEC/TERM/READY/EXCEPT |
| 使用场景 | 学习、轻量嵌入 | 服务器框架运行时 |
| 内存占用 | 低，大量协程更省栈内存 | 较高，但切换无需复制栈 |
| 复杂度 | 极低 | 较高 |

## 四、总结

`cloudwu/coroutine` 展示了用户态协程的最小闭环：上下文、共享栈、yield/resume 和状态机。它非常适合学习协程切换的本质，尤其是共享栈保存与恢复的技巧。

`sylar` 则展示了工程化协程运行时的完整形态：协程对象、调度器、线程池、IO 事件、定时器和 hook 共同组成一个异步运行环境。它的目标不是只提供协程切换，而是让服务器程序可以用同步写法获得异步 IO 的性能。
