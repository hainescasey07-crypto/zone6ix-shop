(() => {
  const OWNER_EMAIL = "hainescasey07@gmail.com";
  const OWNER_PATTERN = /hainescasey07@gmail\.com/gi;

  function displayIdentity(value, replacement = "Owner") {
    const text = String(value ?? "");
    return text.replace(OWNER_PATTERN, replacement);
  }

  function isSkippable(node) {
    const parent = node.parentElement;
    return !parent || ["SCRIPT", "STYLE", "TEXTAREA", "OPTION", "CODE", "PRE"].includes(parent.tagName);
  }

  function maskTextNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE || isSkippable(node)) return;
    if (OWNER_PATTERN.test(node.nodeValue || "")) {
      OWNER_PATTERN.lastIndex = 0;
      node.nodeValue = displayIdentity(node.nodeValue, "Owner");
    }
    OWNER_PATTERN.lastIndex = 0;
  }

  function maskTree(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      maskTextNode(root);
      return;
    }
    if (!(root instanceof Element) && root !== document.body) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) maskTextNode(node);
  }

  window.zone6ixDisplayIdentity = displayIdentity;
  window.zone6ixIsOwnerEmail = value => String(value || "").trim().toLowerCase() === OWNER_EMAIL;
  window.zone6ixOwnerPublicContact = "Discord: Ykzues";

  const start = () => {
    maskTree(document.body);
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") maskTextNode(mutation.target);
        mutation.addedNodes.forEach(maskTree);
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
