declare module "pdfmake/build/pdfmake" {
  interface TDocumentDefinitions {
    pageSize?: string;
    pageOrientation?: string;
    pageMargins?: number[];
    defaultStyle?: Record<string, unknown>;
    styles?: Record<string, Record<string, unknown>>;
    content?: unknown[];
  }
  interface PdfMake {
    createPdf: (doc: TDocumentDefinitions) => { download: (filename?: string) => void };
    vfs?: Record<string, string>;
    addVirtualFileSystem?: (vfs: Record<string, string>) => void;
  }
  const pdfMake: PdfMake;
  export default pdfMake;
}

declare module "pdfmake/build/vfs_fonts" {
  const vfs: Record<string, string>;
  export default vfs;
}
