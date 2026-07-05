export type CitationStyle = "APA" | "MLA" | "IEEE" | "AMA";

export interface Source {
  url: string;
  title: string;
  siteName: string;
  authors: string[];
  publisher?: string;
  pubDate?: string;
  accessDate: string;
  city?: string;
  volume?: string;
  number?: string;
  pages?: string;
  doi?: string;
}
