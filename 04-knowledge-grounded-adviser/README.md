# A knowledge-grounded LLM adviser

An installable web app that answers advisory questions from my own methodology, built so I could get a usable answer on site or between meetings. An experiment rather than a finished product, and I would present it that way.

## What I did

Built the concept with Claude: defined what it needed to do, what the answer format should be, and what knowledge it should reason from. I have not put it through the testing the other projects have had.

## What the repository contains

A direct Anthropic Messages API integration, a knowledge base injected into context with prompt caching, model routing by response mode, conversation history management, input validation, a passcode-gated endpoint, and knowledge files held server side so they are never publicly served.

## It is not RAG, and I want to be exact about that

`loadKnowledge()` reads every markdown file in `api/knowledge/`, concatenates all six, and injects the whole corpus as a single system block on every request. There is no query embedding, no similarity search, no chunk selection and no reranking. Every question receives the entire knowledge base.

That is knowledge-grounded long-context prompting with caching. It is not retrieval-augmented generation, and calling it RAG because the two get conflated would be wrong.

## Worth looking at

**Prompt caching on the expensive block.** The knowledge base carries `cache_control: { type: 'ephemeral' }`, so the large constant block is not re-billed on every turn while the cache is warm. The short volatile instructions sit in a separate uncached block above it, which is the order that makes caching work.

**Model routing as cost control.** Short mode runs Haiku with 500 max tokens, detail mode runs Sonnet with 1200. Most questions asked in a car park do not need the larger model.

**Knowledge files under `/api/`.** Vercel does not serve that directory as static content, so the knowledge base is readable by the function and not by the public. The alternative, `/public/`, would have published my methodology.

**History trimmed to six turns, inputs capped at 4,000 characters.** Both bound the context and the bill.

## Known limitations

See [REVIEW-NOTES.md](../REVIEW-NOTES.md).
