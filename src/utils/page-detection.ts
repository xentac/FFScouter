export const torn_page = (): boolean => {
  return window.location.hostname.includes('torn.com');
};

export const on_navigation = (callback: () => void): void => {
  const observer = new MutationObserver(() => {
    callback();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  window.addEventListener('hashchange', callback);
};