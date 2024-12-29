function getUserAgent() {
    return navigator.userAgent;
}
function uuidv4() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
        (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
    );
}

class WakaCore {
    lastHeartbeatSentAt = 0;
    shouldSendHeartbeat() {
        return Date.now() - this.lastHeartbeatSentAt >= 120000;
    }
    getProjectName() {
        let tabName = document.title;
        let fromHeading = document.getElementsByClassName("navbar-document-name")[0].textContent;
        if (tabName.split("|")[0].replace("\n", "").trim() == fromHeading.replace("\n", "").trim()) {
            return tabName.split("|")[0].replace("\n", "").trim();
        } else {
            return fromHeading.replace("\n", "").trim();
        }
    }
    buildHeartbeat(url) {
        return {
            branch: "<<LAST_BRANCH>>",
            category: "Designing",
            entity: url,
            id: uuidv4(),
            language: "Onshape",
            plugin: "onshape-wakatime-plugin_" + getUserAgent(),
            project: this.getProjectName() ?? '<<LAST_PROJECT>>',
            time: this.getCurrentTime(),
            type: url,
        };
    }

    getCurrentTime() {
        const m = moment();
        return `${m.format('x').slice(0, -3)}.${m.format('x').slice(-3)}`;
    }

    sendHeartBeat(url, api) {
        const heartbeat = this.buildHeartbeat(url);
        if (!this.shouldSendHeartbeat()) return;
        this.lastHeartbeatSentAt = Date.now();

        // const xhr = new XMLHttpRequest();
        // xhr.open("POST", "https://wakatime.com/api/v1/heartbeats", true);
        // xhr.setRequestHeader("Content-Type", "application/json");
        // xhr.send(JSON.stringify(heartbeat));
    }
}