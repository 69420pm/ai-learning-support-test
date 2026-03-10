from dotenv import load_dotenv

from ai.ai import initialize_ai, process_documents
from pdf_collector.app import PDFCollectorApp
from pdf_collector.cli import CLI


def main() -> None:
    app = PDFCollectorApp(cli=CLI())
    loaded_pdfs = app.run()

    load_dotenv()
    print(process_documents(loaded_pdfs))



if __name__ == "__main__":
    main()
