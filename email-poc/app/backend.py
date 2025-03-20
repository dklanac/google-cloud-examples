import google.cloud.discoveryengine_v1 as discoveryengine
import google.cloud.discoveryengine_v1alpha as discoveryengine_alpha
from anthropic import AsyncAnthropicVertex
from signed_url import generate_signed_url

LOCATION1 = "us-east5"  # or "europe-west1"

# VERTEX SEARCH PARAMETERS
VS_LOCATION = "global"
VS_DATASTORE_ID = "yyyyyyyyyyyyyyyyy"
PROJECT_ID = "xxxxxxxxxxxx"
CLIENT_NAME = "ABC Corp"

client = AsyncAnthropicVertex(region=LOCATION1, project_id=PROJECT_ID)

# vertex search clients
vertex_search = discoveryengine.SearchServiceClient(
    client_options=dict(
        api_endpoint=(f"{VS_LOCATION}-" if VS_LOCATION != "global" else "")
        + "discoveryengine.googleapis.com"
    )
)

# Setup the serving config
serving_config = vertex_search.serving_config_path(
    project=PROJECT_ID,
    location=VS_LOCATION,
    data_store=VS_DATASTORE_ID,
    serving_config="default_serving_config",
)

SEARCH_RESULTS_CACHE = {}


async def get_custom_context(user_query):
    search_response = vertex_search.search(
        request=discoveryengine.SearchRequest(
            query=user_query,
            page_size=10,
            serving_config=serving_config,
            content_search_spec=discoveryengine.SearchRequest.ContentSearchSpec(
                extractive_content_spec=discoveryengine.SearchRequest.ContentSearchSpec.ExtractiveContentSpec(
                    # max_extractive_answer_count=5,
                    max_extractive_segment_count=10,
                    return_extractive_segment_score=True,
                    num_previous_segments=3,
                    num_next_segments=3,
                )
            ),
            query_expansion_spec=discoveryengine.SearchRequest.QueryExpansionSpec(
                condition=discoveryengine.SearchRequest.QueryExpansionSpec.Condition.AUTO
            ),
            spell_correction_spec=discoveryengine.SearchRequest.SpellCorrectionSpec(
                mode=discoveryengine_alpha.SearchRequest.SpellCorrectionSpec.Mode.AUTO
            ),
        )
    )

    SEARCH_RESULTS_CACHE[user_query] = search_response
    # parse response segments into text string:
    total_segments = 0
    context = []
    for r, result in enumerate(search_response.results):
        if result.document.derived_struct_data is not None:
            doc = dict(result.document.derived_struct_data)
            if "title" in doc.keys():
                title = doc["title"]
            else:
                title = f"Document {r + 1}"  # Fallback title if not available
            if "extractive_segments" in doc.keys():
                for e, extract in enumerate(doc["extractive_segments"]):
                    # relevance_score = extract['relevanceScore']
                    # print(relevance_score)
                    segment = f"[{title} - Segment {e + 1}]: {extract['content']}\n\n"
                    context.append(segment)
                    total_segments += 1
        else:
            print(f"Result {r} has no data.")
    context = "".join(context)
    # construct prompt:
    prompt = f"Context:\n {context} \n Answer the  following user query using the aforementioned context and add a lot of detail, context and specificity. \n user query: \n {user_query}\nAnswer and Explanation:"

    async with client.messages.stream(
        model="claude-3-5-sonnet@20240620",
        max_tokens=4096,
        temperature=0,
        system=f"You are a very helpful and accurate agent that answers questions for the {CLIENT_NAME} legal team. cite chronological dates, email subject lines and relevant passages to support your answers.",
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
    ) as stream:
        async for chunk in stream.text_stream:
            yield chunk


def get_sources(user_query):
    search_response = SEARCH_RESULTS_CACHE[user_query]
    text = "<ul>"
    for r, result in enumerate(search_response.results):
        if result.document.derived_struct_data is not None:
            if r > 0:
                text += "\n"
            doc = dict(result.document.derived_struct_data)
            bucket_name, blob_name = doc["link"].replace("gs://", "").split("/", 1)
            link = generate_signed_url(bucket_name, blob_name)
            # link = doc
            pdf_name = doc["link"].rsplit("/", 1)[-1]
            text += f'<li><a href="{link}">{r + 1}. {pdf_name}</a></li>'
            if "extractive_answers" in doc.keys():
                for e, extract in enumerate(doc["extractive_answers"]):
                    part = extract["content"][
                        0 : min([250, len(extract["content"])])
                    ].replace("\n", "")
                    # Check if 'pageNumber' key exists before accessing it
                    if "pageNumber" in extract:
                        page_number = extract["pageNumber"]
                        link_with_page = f"{link}#page={page_number}"
                        text += f"\n  - Page = {page_number}: <a href='{link_with_page}' target='_blank'>{part}...</a>"
                    else:
                        text += f"\n  - <a href='{link}' target='_blank'>{part}...</a>"
        else:
            print(f"Result {r} has no data.")
    text += "</ul>"
    markdown_sources = "###\n" + text

    return markdown_sources
