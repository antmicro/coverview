import { clearHighlight, highlightByNum, scrollChunkIntoView } from "./codeViewerUtils";
import { nextTick, ref, watch } from 'vue';

export default class CodeSearchModel {
  constructor(lines, chunkSize, visibleChunk) {
    this.lines = lines;
    this.chunkSize = chunkSize;
    this.visibleChunk = visibleChunk;
    this.results = [];
    this.resultsByLine = new Map();
    this.scrollRequestId = 0;
    this.currentResult = ref(-1);
    this.tokensInVisibleChunk = ref(this.getTokensInVisibleChunk());
    watch(this.visibleChunk, () => this.tokensInVisibleChunk.value = this.getTokensInVisibleChunk());
  }

  async waitForLine(n) {
    while (true) {
      await nextTick();
      const elem = document.querySelector('#L'+n);
      if (elem) return elem;
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
  }

  async goToCurrentResult() {
    const requestId = ++this.scrollRequestId;
    clearHighlight();
    const line = this.results[this.currentResult.value].line;
    this.visibleChunk.value = scrollChunkIntoView(line, this.visibleChunk.value, this.chunkSize);
    const elem = await this.waitForLine(line);
    if (requestId !== this.scrollRequestId) return;
    elem.scrollIntoView({ block: 'center' });
    highlightByNum(line);
  }

  switchResult(result) {
    if (this.results.length === 0) return 0;
    this.currentResult.value = result;
    this.tokensInVisibleChunk.value = this.getTokensInVisibleChunk();
    this.goToCurrentResult();
    return this.currentResult.value;
  }

  nextResult() {
    return this.switchResult((this.currentResult.value + 1) % this.results.length);
  }

  prevResult() {
    return this.switchResult((this.currentResult.value - 1 + this.results.length) % this.results.length);
  }

  getTokensInVisibleChunk() {
    return this.lines.value.slice(Math.max(0, (this.visibleChunk.value - 2) * this.chunkSize), this.chunkSize * (this.visibleChunk.value + 1)).map((line) => this.getTokens(line));
  }

  getTokens(line) {
    if (!line.code) return [{ start: 0, end: 0 }];

    const results = this.resultsByLine.get(line.n);
    if (results) {
      const newTokens = [];
      let currentChar = 0;
      for (const r of results) {
        // If there is code between currentChar and the result start, add an unhighlighted token there.
        if (currentChar !== r.start) newTokens.push({ start: currentChar, end: r.start });
        newTokens.push({ start: r.start, end: r.end, highlight: r.resultIndex === this.currentResult.value ? "selected" : "result" });
        currentChar = r.end;
      }
      // Fill in the space between last result and end of line with an unhighlighted token.
      if (currentChar !== line.code.length) newTokens.push({ start: currentChar, end: line.code.length });
      return newTokens;
    }
    return [{ start: 0, end: line.code.length }];
  }

  onSearch(query) {
    this.scrollRequestId++;
    clearHighlight();
    this.results = [];
    this.resultsByLine = new Map();
    this.currentResult.value = -1;

    if (!query) {
      this.tokensInVisibleChunk.value = this.getTokensInVisibleChunk();
      return 0;
    }

    const lowerQuery = query.toLowerCase();

    for (const line of this.lines.value) {
      if (!line.code) continue;

      const lowerCode = line.code.toLowerCase();
      const matches = [];
      let start = lowerCode.indexOf(lowerQuery);

      while (start !== -1) {
        const match = { start, end: start + query.length, resultIndex: this.results.length };
        matches.push(match);
        start = lowerCode.indexOf(lowerQuery, match.end);
        this.results.push({ line: line.n });
      }
      if (matches.length > 0) this.resultsByLine.set(line.n, matches);
    }

    this.currentResult.value = this.results.length > 0 ? 0 : -1;

    if (this.currentResult.value !== -1) this.goToCurrentResult();
    this.tokensInVisibleChunk.value = this.getTokensInVisibleChunk();

    return this.results.length;
  }
}
