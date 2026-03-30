
import asyncio, contextvars

api_key_ctx = contextvars.ContextVar("api_key")

queue = asyncio.Queue()

async def tool():
    print("Tool says api_key is:", api_key_ctx.get(None))

async def handle_sse():
    api_key_ctx.set("MY_SECRET_KEY")
    while True:
        msg = await queue.get()
        if msg == "quit": break
        await tool()

async def handle_post():
    # this runs in a separate task
    await queue.put("hello")
    await asyncio.sleep(0.1)
    await queue.put("quit")

async def main():
    # simulate server
    t1 = asyncio.create_task(handle_sse())
    t2 = asyncio.create_task(handle_post())
    await t1
    await t2

asyncio.run(main())

