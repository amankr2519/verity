import { NextRequest, NextResponse } from 'next/server';
import * as mupdf from 'mupdf';

// Force Node.js runtime (mupdf uses native bindings, not Edge compatible)
export const runtime = 'nodejs';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    // 1. Parse the incoming form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    // 2. Validate the file
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'PDF files must be 10MB or smaller' }, { status: 413 });
    }

    // 3. Convert the file to a Uint8Array (required by mupdf)
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // 4. Open document with mupdf
    const doc = mupdf.Document.openDocument(uint8Array, 'application/pdf');
    const pageCount = doc.countPages();
    
    // 5. Extract text from every page
    let fullText = '';
    for (let i = 0; i < pageCount; i++) {
      const page = doc.loadPage(i);
      const textPage = page.toStructuredText('preserve-whitespace');
      fullText += textPage.asText() + '\n\n';
    }

    if (!fullText.trim()) {
      return NextResponse.json(
        { error: 'This PDF does not contain selectable text to fact-check' },
        { status: 422 }
      );
    }

    // 6. Return the extracted text and metadata
    return NextResponse.json({
      success: true,
      pages: pageCount,
      text: fullText,
    });

  } catch (error) {
    console.error('PDF Extraction Error:', error);
    return NextResponse.json(
      { error: 'Failed to extract text from PDF' },
      { status: 500 }
    );
  }
}