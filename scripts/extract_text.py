#!/usr/bin/env python3
"""
Script per estrarre testo da vari formati di ebook
Supporta: EPUB, TXT, PDF (limitato)
"""

import sys
import os
import re
import html2text
from bs4 import BeautifulSoup

def extract_from_epub(epub_path, output_path):
    """Estrae testo da un file EPUB"""
    try:
        import ebooklib
        from ebooklib import epub
        
        book = epub.read_epub(epub_path)
        content = []
        
        for item in book.get_items():
            if item.get_type() == ebooklib.ITEM_DOCUMENT:
                html_content = item.get_content().decode('utf-8')
                soup = BeautifulSoup(html_content, 'html.parser')
                
                # Rimuovi script e stili
                for script in soup(["script", "style"]):
                    script.extract()
                
                text = soup.get_text()
                # Pulisci il testo
                lines = (line.strip() for line in text.splitlines())
                chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
                text = '\n'.join(chunk for chunk in chunks if chunk)
                
                content.append(text)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('\n\n'.join(content))
        
        return True
    
    except Exception as e:
        print(f"Errore nell'estrazione del testo EPUB: {e}", file=sys.stderr)
        return False

def extract_from_txt(txt_path, output_path):
    """Copia il contenuto di un file TXT"""
    try:
        with open(txt_path, 'r', encoding='utf-8', errors='replace') as src:
            content = src.read()
        
        with open(output_path, 'w', encoding='utf-8') as dst:
            dst.write(content)
        
        return True
    
    except Exception as e:
        print(f"Errore nella lettura del file TXT: {e}", file=sys.stderr)
        return False

def extract_from_pdf(pdf_path, output_path):
    """Estrae testo da un PDF utilizzando pdftotext (se disponibile) o PyPDF2"""
    try:
        # Prova prima con PyPDF2
        try:
            from PyPDF2 import PdfReader
            
            reader = PdfReader(pdf_path)
            content = []
            
            for i in range(len(reader.pages)):
                page = reader.pages[i]
                content.append(page.extract_text())
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write('\n\n'.join(content))
            
            return True
            
        except ImportError:
            # Se PyPDF2 non è disponibile, installa e usa pdftotext
            import subprocess
            
            # Installazione pdftotext se necessario
            result = subprocess.run(["pip", "install", "pdftotext"], capture_output=True)
            
            if result.returncode != 0:
                print("Impossibile installare pdftotext", file=sys.stderr)
                return False
            
            import pdftotext
            
            with open(pdf_path, "rb") as f:
                pdf = pdftotext.PDF(f)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write('\n\n'.join(pdf))
            
            return True
    
    except Exception as e:
        print(f"Errore nell'estrazione del testo PDF: {e}", file=sys.stderr)
        return False

def extract_from_mobi(mobi_path, output_path):
    """Estrae testo da un file MOBI"""
    try:
        # Installazione di mobi se necessario
        import subprocess
        subprocess.run(["pip", "install", "mobi"], capture_output=True)
        
        from mobi import Mobi
        
        book = Mobi(mobi_path)
        book.parse()
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(book.book_html.decode('utf-8', errors='replace'))
        
        return True
    
    except Exception as e:
        print(f"Errore nell'estrazione del testo MOBI: {e}", file=sys.stderr)
        return False

def main():
    if len(sys.argv) != 4:
        print("Utilizzo: python extract_text.py <file_input> <file_output> <estensione>", file=sys.stderr)
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    extension = sys.argv[3].lower()
    
    if not os.path.exists(input_file):
        print(f"File non trovato: {input_file}", file=sys.stderr)
        sys.exit(1)
    
    result = False
    
    if extension == '.epub':
        result = extract_from_epub(input_file, output_file)
    elif extension == '.txt':
        result = extract_from_txt(input_file, output_file)
    elif extension == '.pdf':
        result = extract_from_pdf(input_file, output_file)
    elif extension == '.mobi':
        result = extract_from_mobi(input_file, output_file)
    else:
        print(f"Formato non supportato: {extension}", file=sys.stderr)
        sys.exit(1)
    
    if not result:
        sys.exit(1)

if __name__ == "__main__":
    main()
