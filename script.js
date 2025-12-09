const container = document.querySelector('.container')
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector('.prompt-form');
const promptInput = promptForm.querySelector('.prompt-input');
const FileInput = promptForm.querySelector("#file-input");
const fileuploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggle = document.querySelector('#theme-toggle-btn')

// ApI Setup 
const API_Key = 'AIzaSyBpr8Rxa2B8xo2Q3oXsBBHsn9GfC5oHXUo'
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_Key}`

// variable
let typingInterval , controller ;
const chatHistory = [];
const userData = { message: "", file: {} }

// scroll to bottom of the container
const scrollToButton = () => {
  container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
}

// simulate typing effect for bot response
const typingEffect = (responseText, TextElement, botMsgDiv) => {
  TextElement.textContent = '';
  const words = responseText.split(" ");
  let wordIndex = 0;
  // set an interval to type each word
  typingInterval= setInterval(() => {
    if (wordIndex < words.length) {
      TextElement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
      scrollToButton();
    } else {
      clearInterval(typingInterval);
      botMsgDiv.classList.remove("loading")
      document.body.classList.remove("bot-responding");
    }
  }, 70)
}

// Functions To Create Message Elements
const createMsgElement = (content, ...Classes) => {
  const div = document.createElement('div');
  div.classList.add('message', ...Classes);
  div.innerHTML = content;
  return div;
}

// generates the bots response using Gemini free api 
const generateResponse = async (botMsgDiv) => {
  const TextElement = botMsgDiv.querySelector('.message-text');
  controller = new AbortController();
  // Add user Message to the chat History
  chatHistory.push({
    role: "user",
    parts: [{ text: userData.message }, ...(userData.file.data ? [{
      inline_data: (({ fileName, isImage, ...
        rest }) => rest)(userData.file)
    }] : [])]
  })
  try {
    // send the chat history to the api
    const response = await fetch(API_URL, {
      method: 'post',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: chatHistory }),
      signal: controller.signal
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);
    const responseText = data.candidates[0].content.parts[0].text;
    typingEffect(responseText, TextElement, botMsgDiv);
    chatHistory.push({
      role: "model",
      parts: [{ text: responseText }]
    });
    console.log(chatHistory);
  } catch (error) {
    TextElement.style.color ="#d62939"
    TextElement.textContent = error.name === "AbortError" ? "Response generation stopped ." : error.message ;
    botMsgDiv.classList.remove("loading")
    document.body.classList.remove("bot-responding");
    scrollToButton();
  } finally {
    userData.file = {};
  }
}

// Handle the Form Submission
const handleFormSubmit = (e) => {
  e.preventDefault()
  const userMessage = promptInput.value.trim();
  if (!userMessage || document.body.classList.contains("bot-responding")) return;
  promptInput.value = "";
  userData.message = userMessage;
  document.body.classList.add("bot-responding" , "chats-active");
  fileuploadWrapper.classList.remove("active", "img-attached", "file-attached")
  // Generate user message html and add it in chat container
  const userMessageHtml = `
    <p class="message-text"></p>
    ${userData.file.data ? (userData.file.isImage ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}"class="img-attachment"/>` : `<p class="file-attachment"><span
    class="material-symbols-rounded">description</span>${ userData.file.fileName }</p>`) : ""}
  `
  const userMsgDiv = createMsgElement(userMessageHtml, 'user-message');
  userMsgDiv.querySelector(".message-text").textContent = userMessage;
  chatsContainer.appendChild(userMsgDiv);
  scrollToButton();

  setTimeout(() => {
    // Generate bot message html and add it in chat container after 600ms
    const botMessageHtml = `<img src="gemini-chatbot-logo.svg" alt="avatar" class="avatar"> <p class="message-text">Just a sec...</p>`
    const botMsgDiv = createMsgElement(botMessageHtml, 'bot-message', "loading");
    chatsContainer.appendChild(botMsgDiv);
    scrollToButton();
    generateResponse(botMsgDiv)
  }, 600)
}

// handle file Input change (file upload)
FileInput.addEventListener("change", () => {
  const file = FileInput.files[0];
  if (!file) return;
  const isImage = file.type.startsWith("image/");
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = (e) => {
    FileInput.value = "";
    const base64String = e.target.result.split(",")[1]
    fileuploadWrapper.querySelector(".file-preview").src = e.target.result;
    fileuploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");
    userData.file = { fileName: file.name, data: base64String, mime_type: file.type, isImage }
  }
})

// cancel file upload
document.querySelector("#cancel-file-btn").addEventListener("click", () => {
  userData.file = {};
  fileuploadWrapper.classList.remove("active", "img-attached", "file-attached")
})

// Stop response
document.querySelector("#stop-response-btn").addEventListener("click", () => {
  userData.file = {};
  controller?.abort();
  clearInterval(typingInterval);
  chatsContainer.querySelector(".bot-message.loading").classList.remove("loading")
  document.body.classList.remove("bot-responding");
})

// Delete all chats
document.querySelector("#delete-chats-btn").addEventListener("click", () => {
  chatHistory.length = 0 ;
  chatsContainer.innerHTML = "";
  document.body.classList.remove("bot-responding" , "chats-active");
})

// handle suggestion click
document.querySelectorAll(".suggestions-item").forEach((item)=>{
  item.addEventListener("click" , ()=>{
    promptInput.value = item.querySelector(".text").textContent ;
    promptForm.dispatchEvent(new Event("submit"))
  });
})

// toggle dark/light theme
themeToggle.addEventListener('click' , ()=>{
  const isLightTheme = document.body.classList.toggle("light-theme");
  localStorage.setItem("themeColor" , isLightTheme ? "light_mode" : "dark_mode" )
  themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode"
})

// set initial theme from local storage
const isLightTheme = localStorage.getItem("themeColor") === "light_mode" ;
document.body.classList.toggle("light-theme" , isLightTheme )
themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode"

promptForm.addEventListener('submit', handleFormSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click", () => {
  FileInput.click();
})
