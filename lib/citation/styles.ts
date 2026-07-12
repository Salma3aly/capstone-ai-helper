import type { Source, CitationStyle } from "./types";

function formatAuthors(authors: string[], style: CitationStyle): string {
  if (authors.length === 0) return "";

  if (style === "APA") {
    if (authors.length === 1) {
      const parts = authors[0].split(" ");
      const last = parts.pop() || "";
      const initials = parts.map((p) => p[0] + ".").join(", ");
      return `${last}, ${initials}`;
    }
    if (authors.length === 2) {
      return authors
        .map((a) => {
          const parts = a.split(" ");
          const last = parts.pop() || "";
          const initials = parts.map((p) => p[0] + ".").join(", ");
          return `${last}, ${initials}`;
        })
        .join(" & ");
    }
    return authors
      .slice(0, 5)
      .map((a) => {
        const parts = a.split(" ");
        const last = parts.pop() || "";
        const initials = parts.map((p) => p[0] + ".").join(", ");
        return `${last}, ${initials}`;
      })
      .join(", ") + "...";
  }

  if (style === "MLA") {
    if (authors.length === 1) {
      const parts = authors[0].split(" ");
      const last = parts.pop() || "";
      return `${last}, ${parts.join(" ")}`;
    }
    if (authors.length === 2) {
      const first = (() => {
        const parts = authors[0].split(" ");
        const l = parts.pop() || "";
        return `${l}, ${parts.join(" ")}`;
      })();
      return `${first}, and ${authors[1]}`;
    }
    return `${authors[0].split(" ").pop() || ""}, ${authors[0].split(" ").slice(0, -1).join(" ")}, et al.`;
  }

  if (style === "IEEE") {
    return authors
      .map((a) => {
        const parts = a.split(" ");
        const last = parts.pop() || "";
        const initials = parts.map((p) => p[0]).join(".");
        return `${initials}. ${last}`;
      })
      .join(", ");
  }

  if (style === "AMA") {
    return authors
      .map((a) => {
        const parts = a.split(" ");
        const last = parts.pop() || "";
        const initials = parts.map((p) => p[0]).join("");
        return `${last} ${initials}`;
      })
      .join(", ");
  }

  return authors.join(", ");
}

function formatDate(date: string, style: CitationStyle): string {
  if (!date) return "n.d.";
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;

  if (style === "APA" || style === "AMA") {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  if (style === "MLA") {
    const months = [
      "Jan.", "Feb.", "Mar.", "Apr.", "May", "June",
      "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec.",
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  if (style === "IEEE") {
    const months = [
      "Jan.", "Feb.", "Mar.", "Apr.", "May", "June",
      "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec.",
    ];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  return date;
}

export function formatCitation(source: Source, style: CitationStyle): string {
  const author = formatAuthors(source.authors, style);
  const title = source.title || "Untitled";
  const site = source.siteName || "Website";
  const url = source.url || "";
  const pubDate = formatDate(source.pubDate || "", style);

  switch (style) {
    case "APA": {
      const datePart = source.pubDate ? `(${pubDate})` : "(n.d.)";
      if (author) {
        const sitePart = author.toLowerCase().includes(site.toLowerCase()) ? "" : ` ${site}.`;
        return `${author}. ${datePart}. ${title}.${sitePart} ${url}`;
      } else {
        return `${site}. ${datePart}. ${title}. ${url}`;
      }
    }

    case "MLA": {
      const authorPart = author ? `${author}. ` : `${site}. `;
      const sitePart = author ? ` ${site},` : "";
      const datePart = source.pubDate ? `${pubDate} ` : "";
      return `${authorPart}"${title}."${sitePart} ${datePart}${url}.`;
    }

    case "IEEE": {
      const authorPart = author ? `${author}, ` : `${site}, `;
      const sitePart = author ? ` "${title}," ${site}.` : ` "${title}."`;
      const datePart = source.pubDate ? ` ${pubDate}` : "";
      return `${authorPart}${sitePart}${datePart}. [Online]. Available: ${url}`;
    }

    case "AMA": {
      const authorPart = author ? `${author}. ` : `${site}. `;
      const sitePart = author ? ` ${site}.` : "";
      const datePart = source.pubDate ? ` Published ${pubDate}.` : "";
      return `${authorPart}${title}.${sitePart}${datePart} ${url}`;
    }

    default:
      return "";
  }
}

export function formatAllCitations(source: Source): Record<CitationStyle, string> {
  return {
    APA: formatCitation(source, "APA"),
    MLA: formatCitation(source, "MLA"),
    IEEE: formatCitation(source, "IEEE"),
    AMA: formatCitation(source, "AMA"),
  };
}
