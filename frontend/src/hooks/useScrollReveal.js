import { useEffect } from "react";

// Enhance visible content only when motion and observation are supported.
export function useScrollReveal(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (
      !root ||
      !window.matchMedia ||
      !window.IntersectionObserver ||
      !window.MutationObserver
    )
      return;

    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let stop = () => {};
    const visit = (node, callback) => {
      if (node.nodeType !== 1) return;
      if (node.matches("[data-reveal]")) callback(node);
      node.querySelectorAll("[data-reveal]").forEach(callback);
    };

    const start = () => {
      stop();
      if (preference.matches) return;

      const pending = new Set();
      const reveal = (element, animate = true) => {
        element.dataset.revealState = animate ? "visible" : "immediate";
        pending.delete(element);
        observer.unobserve(element);
      };
      const observer = new window.IntersectionObserver(
        (entries) =>
          entries.forEach((entry) => {
            if (entry.isIntersecting && root.contains(entry.target))
              reveal(entry.target);
          }),
        { threshold: 0.08, rootMargin: "0px 0px -24px 0px" },
      );
      const watch = (element) => {
        if (
          ["visible", "immediate"].includes(element.dataset.revealState) ||
          pending.has(element)
        )
          return;
        element.dataset.revealState = "pending";
        pending.add(element);
        observer.observe(element);
      };
      visit(root, watch);

      const mutations = new window.MutationObserver((records) => {
        records.forEach((record) => {
          record.removedNodes.forEach((node) =>
            visit(node, (element) => {
              observer.unobserve(element);
              pending.delete(element);
            }),
          );
          record.addedNodes.forEach((node) => visit(node, watch));
        });
      });
      mutations.observe(root, { childList: true, subtree: true });

      // Keyboard navigation reveals a control immediately, before any delay.
      const onFocus = (event) => {
        const element = event.target.closest('[data-reveal-state="pending"]');
        if (element) reveal(element, false);
      };
      root.addEventListener("focusin", onFocus);
      stop = () => {
        observer.disconnect();
        mutations.disconnect();
        root.removeEventListener("focusin", onFocus);
        root.querySelectorAll("[data-reveal-state]").forEach((element) => {
          delete element.dataset.revealState;
        });
        pending.clear();
      };
    };

    start();
    preference.addEventListener("change", start);
    return () => {
      stop();
      preference.removeEventListener("change", start);
    };
  }, [rootRef]);
}
