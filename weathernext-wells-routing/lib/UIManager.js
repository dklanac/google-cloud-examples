// UIManager - Single Responsibility for updating the UI
export class UIManager {
  updateWellsStatusList(wells, isDepotOffline = false) {
    const wellsList = document.getElementById("wells-status-list");
    wellsList.innerHTML = "";

    const depotLi = document.createElement("li");
    const depotStatus = isDepotOffline ? "offline" : "online";
    depotLi.innerHTML = `Depot <span class="${depotStatus}">${depotStatus.toUpperCase()}</span>`;
    wellsList.appendChild(depotLi);

    const separator = document.createElement("li");
    separator.style.borderBottom = "2px solid #ccc";
    separator.style.margin = "5px 0";
    wellsList.appendChild(separator);

    let onlineCount = 0;
    let offlineCount = 0;

    wells.forEach((well) => {
      if (well.isOnline()) {
        onlineCount++;
      } else {
        offlineCount++;
      }

      const li = document.createElement("li");
      li.innerHTML = `${well.name}: <span class="${
        well.status
      }">${well.status.toUpperCase()}</span>`;
      wellsList.appendChild(li);
    });

    // Update status counters
    document.getElementById("wells-online").textContent = onlineCount;
    document.getElementById("wells-offline").textContent = offlineCount;
  }
}
