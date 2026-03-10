from pdf_collector.app import PDFCollectorApp
from pdf_collector.cli import CLI


def main() -> None:
    app = PDFCollectorApp(cli=CLI())
    loaded_pdfs = app.run()

    # Future extension point:
    # process_documents(loaded_pdfs)
    _ = loaded_pdfs


if __name__ == "__main__":
    main()
