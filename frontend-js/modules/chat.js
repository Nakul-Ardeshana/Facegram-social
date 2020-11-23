import DOMPurify from "dompurify";

export default class Chat {
  // 1. Select DOM elements, and keep track of any useful data
  constructor() {
    this.openedYet = false;
    this.chatWrapper = document.querySelector("#chat-wrapper");
    this.openIcon = document.querySelector(".header-chat-icon");
    this.injectHTML();
    this.chatLog = document.querySelector("#chat");
    this.chatField = document.querySelector("#chatField");
    this.chatForm = document.querySelector("#chatForm");
    this.closeIcon = document.querySelector(".chat-title-bar-close");
    this.events();
  }

  // 2. Events
  events() {
    this.openIcon.addEventListener("click", () => this.showChat());
    this.closeIcon.addEventListener("click", () => this.hideChat());
    this.chatForm.addEventListener("submit", (e) => {
      e.preventDefault();
      this.sendMessageToServer();
    });
  }

  // 3. Methods
  sendMessageToServer() {
    this.socket.emit("chatMessageFromBrowser", {
      message: this.chatField.value,
      time: new Date(),
    });
    let time = new Date();
    let chatMessage = `<p style="color:lightgray"><strong style="color:white">you</strong> ${time.getHours()}:${time.getMinutes()}</p>${
      this.chatField.value
    }`;
    this.chatLog.insertAdjacentHTML(
      "beforeend",
      DOMPurify.sanitize(`
    <div class="chat-self">
        <div class="chat-message">
          <div class="chat-message-inner">
            ${chatMessage}
          </div>
        </div>
        <img class="chat-avatar avatar-tiny" src="${this.avatar}">
      </div>
    `)
    );
    this.chatLog.scrollTop = this.chatLog.scrollHeight;
    this.chatField.value = "";
    this.chatField.focus();
  }
  hideChat() {
    this.chatWrapper.classList.remove("chat--visible");
  }
  showChat() {
    this.chatWrapper.classList.add("chat--visible");
    if (!this.openedYet) {
      this.openConnection();
    }
    this.openedYet = true;
    this.chatField.focus();
  }
  openConnection() {
    this.socket = io();
    this.socket.on("welcome", (data) => {
      this.username = data.username;
      this.avatar = data.avatar;
    });
    this.socket.on("chatMessageFromServer", (data) => {
      let time = new Date()
      this.displayMessageFromServer(data,time);
    });
  }

  displayMessageFromServer(data,time) {
    let chatMessage = `<a href="/profile/${data.username}"><p style="color:darkgray"><strong style="color:black">${data.username}</strong> ${time.getHours()}:${time.getMinutes()}</p></a>${data.message}`;
    this.chatLog.insertAdjacentHTML(
      "beforeend",
      DOMPurify.sanitize(`
    <div class="chat-other">
      <a href="/profile/${data.username}"><img class="avatar-tiny" src="${data.avatar}"></a>
      <div class="chat-message"><div class="chat-message-inner">
        ${chatMessage}
      </div></div>
    </div>
    `)
    );
    this.chatLog.scrollTop = this.chatLog.scrollHeight;
  }

  injectHTML() {
    this.chatWrapper.innerHTML = `
        <div class="chat-title-bar">Chat <span class="chat-title-bar-close"><i class="fas fa-times-circle"></i></span></div>
        <div id="chat" class="chat-log">
        </div>
        
        <form id="chatForm" class="chat-form border-top">
            <input type="text" class="chat-field" id="chatField" placeholder="Type a message…" autocomplete="off">
        </form>
      `;
  }
}
