# Indexing
Goal is to bring the messy unstructured pdf documents of the user in a structured clean format as good as possible to make the data cheaply searchable and that the llm can get a feel for what is in the documents and what not. All of this should be achieved really cheaply although with the best quality.

## Execution flow
1. chunk all pdfs into chunks of around 50 pages with a 5 page overlap.
2. for each chunk first all entities (topics, concepts, etc.) get extracted and their relationships get noted. After that the pages get splitted up into sections (mostly paragraphs) and each section gets a summary and it gets marked which entities are in this section present. All this gets done with llm calls where context caching gets leveraged.
3. The chunks get programtically merged to remove duplicates and all single pages, entities, relationships and sections get embedded into a vector db to make them searchable.
