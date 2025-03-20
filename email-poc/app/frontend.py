from backend import get_custom_context, get_sources

# from search_with_preview  import get_preview_context
import asyncio
from nicegui import app, ui, run


@ui.page("/")
def main():
    async def send(event=None):
        spinner.visible = True  # Show spinner
        output_markdown1.content = ""  # Clear previous content

        async for chunk in get_custom_context(text.value):
            # print(chunk)  # Debugging line
            output_markdown1.content += chunk
            await asyncio.sleep(0)

        sources1 = await run.io_bound(get_sources, text.value)
        output_markdown1.content += f"\n\n\n\n\n\n\n<u>**Sources:**</u>\n\n"
        output_markdown1.content += sources1

        spinner.visible = False  # Hide spinner

    placeholder = "Type your message here and press enter"

    with ui.row().classes("w-full no-wrap items-center"):
        text = (
            ui.input(placeholder=placeholder)
            .props("rounded outlined input-class=mx-3")
            .classes("w-full self-center")
            .on("keydown.enter", send)
        )
        ui.button("Send", on_click=send)

    spinner = ui.spinner("dots", size="lg", color="primary")
    spinner.visible = False

    output_markdown1 = ui.markdown("")


ui.run(
    title="Legal Assistant",
    storage_secret="sssssssssssssssssssss",
    port=5000,
)
