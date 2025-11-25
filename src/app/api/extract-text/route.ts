import { NextRequest, NextResponse } from 'next/server';
import { extractText } from 'unpdf';

// Extract text from PDF using unpdf
async function extractPdfText(buffer: Buffer): Promise<string> {
  const { text } = await extractText(buffer);
  // text is an array of strings (one per page), join them
  return Array.isArray(text) ? text.join('\n') : String(text);
}

// Extract text from plain text files
function extractPlainText(buffer: Buffer): string {
  return buffer.toString('utf-8');
}

// Extract text from Word documents (.docx) - basic extraction
async function extractDocxText(buffer: Buffer): Promise<string> {
  // For .docx files, we'll extract raw text from the XML content
  // This is a simplified approach - for better extraction, consider mammoth.js
  const JSZip = (await import('jszip')).default;
  
  try {
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file('word/document.xml')?.async('string');
    
    if (!documentXml) {
      throw new Error('Could not find document content');
    }
    
    // Simple XML text extraction - remove all tags and decode entities
    const text = documentXml
      .replace(/<[^>]+>/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    
    return text;
  } catch (error) {
    throw new Error('Failed to extract text from Word document');
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Get file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Determine file type and extract text
    const fileName = file.name.toLowerCase();
    const mimeType = file.type.toLowerCase();
    
    let extractedText = '';

    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      extractedText = await extractPdfText(buffer);
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx')
    ) {
      extractedText = await extractDocxText(buffer);
    } else if (
      mimeType === 'text/plain' ||
      fileName.endsWith('.txt') ||
      fileName.endsWith('.md') ||
      fileName.endsWith('.markdown')
    ) {
      extractedText = extractPlainText(buffer);
    } else if (
      mimeType === 'text/rtf' ||
      fileName.endsWith('.rtf')
    ) {
      // For RTF, extract basic text (simplified)
      extractedText = extractPlainText(buffer)
        .replace(/\\[a-z]+\d*\s?/gi, '')
        .replace(/[{}]/g, '')
        .trim();
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload PDF, DOCX, TXT, or MD files.' },
        { status: 400 }
      );
    }

    // Clean up the extracted text
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .trim();

    if (!extractedText) {
      return NextResponse.json(
        { error: 'Could not extract any text from the file' },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      text: extractedText,
      fileName: file.name,
      fileType: mimeType || 'unknown'
    });
  } catch (error) {
    console.error('Error extracting text:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to extract text from file' },
      { status: 500 }
    );
  }
}
