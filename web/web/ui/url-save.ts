import { parseSettings, loadSettings } from "./settings"

export function toQueryStringInURL() {
    let settings = parseSettings()
    let params = new URLSearchParams("")
    params.set("json", JSON.stringify(settings))
    let str = params.toString()
    return [location.protocol, '//', location.host, location.pathname, "?", str, location.hash].join('');
}

export function fromQueryString() {
    let params = new URLSearchParams(window.location.search)
    if (params.has("json")) {
        let ins = JSON.parse(params.get("json"))
        loadSettings(ins)
    }

}
function saveToLink() {
    // generate new url
    let newURL = toQueryStringInURL()

    // update current w/o reloading
    if (history.pushState) {
        window.history.pushState({ path: newURL }, '', newURL)
    }
    // add to clipboard??
    copyToClipboard(newURL)
    document.getElementById("saveNotif").style.display = "inline"
    setTimeout(() => {
        document.getElementById("saveNotif").style.display = "none"
    }, 20 * 1000);
}

function copyToClipboard(text: string) {
    // from https://stackoverflow.com/questions/33855641/copy-output-of-a-javascript-variable-to-the-clipboard
    var dummy = document.createElement("textarea");
    // to avoid breaking orgain page when copying more words
    // cant copy when adding below this code
    // dummy.style.display = 'none'
    document.body.appendChild(dummy);
    //Be careful if you use texarea. setAttribute('value', value), which works with "input" does not work with "textarea". – Eduard
    dummy.value = text;
    dummy.select();
    document.execCommand("copy");
    document.body.removeChild(dummy);
}



document.getElementById("saveToLinkButton").addEventListener("click", saveToLink, false);
