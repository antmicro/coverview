export const clearHighlight = () => {
  document.querySelectorAll('.highlighted-line').forEach(el => el.classList.remove('highlighted-line'));
};

export const scrollChunkIntoView = (line, visibleChunk, chunkSize) => {
  const targetChunk = Math.ceil(line / chunkSize);
  if (Math.abs(visibleChunk - targetChunk) > 1) {
    const chunkMarker = document.getElementById(String(targetChunk));
    if (chunkMarker) chunkMarker.scrollIntoView();
  }
  return targetChunk;
}

export const highlightByNum = (num) => {
  const el = document.querySelector(`#L${num}`);
  if (el) {
    const tr = el.closest('tr.line-row');
    if (tr) {
      tr.classList.add('highlighted-line');
    }
  }
}
