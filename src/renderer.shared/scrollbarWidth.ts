import "./scrollbarWidth.css";

export const getScrollbarWidth = (): number => {
  const scrollDiv = document.createElement("div");
  scrollDiv.className = "scrollbar-measure";
  document.body.appendChild(scrollDiv);

  // Get the scrollbar width
  const result = scrollDiv.offsetWidth - scrollDiv.clientWidth;
  console.warn(result); // Mac:  15

  // Delete the DIV
  document.body.removeChild(scrollDiv);
  return result;
};
