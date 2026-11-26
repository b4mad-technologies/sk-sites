/**
 * Extracts the first sentence from free text for a dense inline summary.
 * Cuts at the first `.`, `!` or `?` followed by whitespace or end of string,
 * strips Markdown emphasis markers, and caps the result length with an ellipsis.
 *
 * An underscore is only an emphasis marker at a word BOUNDARY. Stripping every
 * one of them turned `{target_name}` into `{targetname}` in every inline
 * summary — outcome descriptions are written with exactly those placeholders
 * (sk-jay0.7.96). Asterisks have no such double life and are stripped
 * everywhere.
 */
export function firstSentence(text: string, maxLength = 160): string {
	const stripped = text.replace(/\*/g, "").replace(/(?<![A-Za-z0-9])_+|_+(?![A-Za-z0-9])/g, "");
	const match = stripped.match(/^[\s\S]*?[.!?](?=\s|$)/);
	const sentence = (match ? match[0] : stripped).trim();
	if (sentence.length <= maxLength) return sentence;
	return `${sentence.slice(0, maxLength - 1).trimEnd()}…`;
}
