const observer = new MutationObserver(async () => {
    const fullText = extractAllText();
    if (fullText) {
      observer.disconnect();
      createQueryInput();
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  
  async function generateResponse(userMessage) {
    try {
      const truncatedContent = userMessage.slice(0, 5000);
      const response = await fetch("https://api.cohere.com/v2/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer c5cR9HeLMaRjKL5TlLmCvnwrgnSj1iioQKJJ6vmd"
        },
        body: JSON.stringify({
          max_tokens: 300,
          model: "command-r",
          messages: [
            { 
              role: "system", 
              content: "You are a helpful assistant. Return answers like flashcard responses." 
            },
            { 
              role: "user", 
              content: truncatedContent 
            }
          ]
        })
      });
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      return data.message.content[0].text;
    } catch (error) {
      console.error("Cohere API Error:", error);
      return "Error generating response. Check console for details.";
    }
  }
  
  function extractAllText() {
    return document.body.innerText.replace(/[\s\n]+/g, ' ').trim();
  }
  
  async function handleUserQuery(query) {
    const fullText = extractAllText();
    if (!fullText) return console.error("No text content detected");
    
    try {
      const response = await generateResponse(
        `Based on this content: "${fullText.slice(0, 5000)}", answer: "${query}"`
      );
  
      chrome.storage.local.get({ flashcards: [] }, (data) => {
        const newFlashcard = {
          id: Date.now(),
          question: query,
          answer: response,
          source: window.location.href
        };
        chrome.storage.local.set({ flashcards: [...data.flashcards, newFlashcard] });
      });
      
      alert(`Flashcard saved successfully!\nQ: ${query}\nA: ${response.slice(0, 100)}...`);
    } catch (error) {
      console.error("Processing Error:", error);
      alert("Failed to save flashcard. Check console for details.");
    }
  }
  
  function createQueryInput() {
    const existingInput = document.getElementById("flashcard-input-container");
    if (existingInput) return;
  
    const container = document.createElement("div");
    container.id = "flashcard-input-container";
    Object.assign(container.style, {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      backgroundColor: "#ffffff",
      padding: "15px",
      borderRadius: "10px",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.15)",
      zIndex: "2147483647",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      minWidth: "300px"
    });
  
    const inputField = document.createElement("input");
    Object.assign(inputField.style, {
      padding: "10px",
      border: "1px solid #cccccc",
      borderRadius: "5px",
      fontSize: "14px"
    });
    inputField.placeholder = "Enter your question...";
  
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.gap = "8px";
  
    const submitButton = createButton("Ask", "#007bff", () => {
      const query = inputField.value.trim();
      if (query) handleUserQuery(query);
      inputField.value = "";
    });


    const viewButton = createButton("View Flashcards", "#28a745", () => {
    window.open(chrome.runtime.getURL('popup.html'), '_blank');
  });
  
    buttonContainer.appendChild(submitButton);
    buttonContainer.appendChild(viewButton);
    container.appendChild(inputField);
    container.appendChild(buttonContainer);
    document.documentElement.appendChild(container);
  }
  
  function createButton(text, color, onClick) {
    const button = document.createElement("button");
    Object.assign(button.style, {
      padding: "8px 12px",
      backgroundColor: color,
      color: "#ffffff",
      border: "none",
      borderRadius: "5px",
      cursor: "pointer",
      flex: "1"
    });
    button.textContent = text;
    button.addEventListener("click", onClick);
    return button;
  }