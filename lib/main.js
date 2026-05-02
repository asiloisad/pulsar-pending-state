const { CompositeDisposable } = require("atom");

module.exports = {
  activate() {
    this.disposables = new CompositeDisposable(
      atom.commands.add("atom-workspace", {
        "pending-state:toggle": () => this.toggle(),
      }),
    );
    this.pendingSubscription = null;
  },

  deactivate() {
    this.pendingSubscription?.dispose();
    this.pendingSubscription = null;
    this.disposables.dispose();
  },

  toggle() {
    const pane = atom.workspace.getActivePane();
    if (!pane) return;
    const item = pane.getActiveItem();
    if (!item) return;
    const isPending = pane.getPendingItem() === item;
    if (isPending) {
      this.pendingSubscription?.dispose();
      this.pendingSubscription = null;
      pane.clearPendingItem();
    } else {
      pane.setPendingItem(item);
      // When opened natively as pending, Pulsar wires onDidChange -> terminatePendingState.
      this.pendingSubscription?.dispose();
      this.pendingSubscription = typeof item.onDidChange === "function"
        ? item.onDidChange(() => {
            this.pendingSubscription?.dispose();
            this.pendingSubscription = null;
            if (typeof item.terminatePendingState === "function") {
              item.terminatePendingState();
            } else {
              pane.clearPendingItem();
            }
          })
        : null;
    }
    // Tabs package listens for onItemDidTerminatePendingState to remove
    // pending styling, but does NOT listen for items becoming pending again.
    // Update the tab CSS classes directly as a workaround.
    const tabs = pane
      .getElement()
      .closest("atom-pane")
      ?.querySelector(".tab-bar")
      ?.querySelectorAll(".tab");
    if (tabs) {
      for (const tab of tabs) {
        if (tab.item === item) {
          tab.classList.toggle("pending-tab", !isPending);
          tab.querySelector(".title")?.classList.toggle("temp", !isPending);
          break;
        }
      }
    }
  },
};
