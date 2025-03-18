import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
puppeteer.use(StealthPlugin());

import fs from "fs";
import minimist from "minimist";

var groups = [];
var channels = [];
var invites = [];
var invalid = [];
var wtf = [];

async function main() {
  var args = minimist(process.argv.slice(2), {
    string: ["f"],
  });

  if (!args.f) {
    console.log("No file provided");
    return;
  }
  const links = fs.readFileSync(args.f).toString().split("\n");

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ["--proxy-server=socks5://127.0.0.1:8124"],
  });
  const page = await browser.newPage();

  for (let link of links) {
    if (link == "") {
      continue;
    }
    if (link.startsWith("#")) {
      continue;
    }

    var url;
    try {
      url = new URL(link);
    } catch (e) {
      console.warn("invalid url: '%s'", link);
      continue;
    }

    if (url.host != "t.me") {
      wtf.push(link);
      continue;
    }
    if (url.pathname.startsWith("/c/")) {
      wtf.push(link);
      continue;
    }
    if (url.pathname.startsWith("/+")) {
      invites.push(link);
      continue;
    }
    if (url.pathname.startsWith("/s/")) {
      url.pathname = url.pathname.slice(3);
    }
    const segments = url.pathname.split("/").filter((segment) => segment !== "");
    if (segments.length > 0) {
      url.pathname = "/" + segments[0];
    } else {
      url.pathname = "/";
    }

    try {
      link = url.toString();
      await page.goto(link, { waitUntil: ["load", "networkidle2"] });
      console.log("link: %s", link);
      const btn_text = await page.$eval("a.tgme_action_button_new", (el) => {
        return el.innerHTML;
      });

      switch (btn_text) {
        case "Send Message": // Definitely a user
          invalid.push(link);
          console.log("...invalid");
          break;
        case "View in Telegram": // Channel or group?
          try {
            // if context link is present and shows "Preview channel", then definitely channel
            const context_link_text = await page.$eval(
              "a.tgme_page_context_link",
              (el) => {
                return el.innerHTML;
              },
            );
            console.log(context_link_text);
            switch (context_link_text) {
              case "Preview channel":
                channels.push(link);
                console.log("...channel");
                break;
              default:
                wtf.push(link);
                console.log("...wtf?");
                break;
            }
          } catch (e) {
            // if context link is missing, probably group
            groups.push(link);
            console.log("...group");
          }
          break;
        default:
          wtf.push(link);
          console.log("...default wtf");
          break;
      }
    } catch (e) {
      console.warn(e);
    }
  }
  await browser.close();

  console.log("");
  console.log("WTF?:");
  wtf.forEach(function(item) {
    console.log(item);
  });

  console.log("");
  console.log("Invites:");
  invites.forEach(function(item) {
    console.log(item);
  });

  console.log("");
  console.log("Invalid:");
  invalid.forEach(function(item) {
    console.log(item);
  });

  console.log("");
  console.log("Channels:");
  channels.forEach(function(item) {
    console.log(item);
  });

  console.log("");
  console.log("Groups:");
  groups.forEach(function(item) {
    console.log(item);
  });
}

main();
