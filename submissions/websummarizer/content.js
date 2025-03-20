document.addEventListener("DOMContentLoaded", () => {
    async function generateResponse(userMessage) {
        try {
            const response = await fetch("https://api.cohere.com/v2/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer 7ciaxvObjwRoJu8wW2jzg9S0f9pCpuXksaZrMCrj",
                },
                body: JSON.stringify({
                    max_tokens: 300,
                    model: "command-r",
                    messages: [
                        { role: "system", content: "You are a helpful assistant." },
                        { role: "user", content: userMessage },
                    ],
                }),
            });

            if (!response.ok) throw new Error(`API error: ${response.status}`);
            const data = await response.json();
            return data.message.content[0].text;
        } catch (error) {
            console.error("Error:", error);
            return "Error generating response.";
        }
    }

    function extractAllText() {
        return document.body.innerText.trim();
    }

    async function handleUserQuery(query) {
        const fullText = extractAllText();
        if (!fullText) return console.error("No text found on the page.");
        const userMessage = `Based on this content: "${fullText}", answer: "${query}"`;
        const response = await generateResponse(userMessage);
        displayResponse(query, response);
    }

    function displayResponse(query, response) {
        let responseBox = document.getElementById("responseBox");
        if (!responseBox) {
            responseBox = document.createElement("div");
            responseBox.id = "responseBox";
            Object.assign(responseBox.style, {
                position: "fixed", bottom: "80px", right: "20px", backgroundColor: "#f9f9f9",
                padding: "15px", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                zIndex: "1000", maxWidth: "350px", maxHeight: "70vh", overflowY: "auto",
                fontFamily: "Arial, sans-serif", fontSize: "14px", color: "#333"
            });
            document.body.appendChild(responseBox);
        }
        responseBox.innerHTML = `<div><strong>Question:</strong> ${query}<br><strong>Response:</strong> ${response}</div>`;
    }

    function createQueryInput() {
        let inputBox = document.getElementById("inputBox");
        if (!inputBox) {
            inputBox = document.createElement("div");
            inputBox.id = "inputBox";
            Object.assign(inputBox.style, {
                position: "fixed", bottom: "20px", right: "20px", backgroundColor: "#fff",
                padding: "10px", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                zIndex: "1000", display: "flex", gap: "10px"
            });

            const inputField = document.createElement("input");
            Object.assign(inputField.style, {
                flex: "1", padding: "8px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "14px"
            });
            inputField.placeholder = "Ask a question...";

            const submitButton = document.createElement("button");
            Object.assign(submitButton.style, {
                padding: "8px 12px", backgroundColor: "#007bff", color: "#fff", border: "none",
                borderRadius: "4px", cursor: "pointer", fontSize: "14px"
            });
            submitButton.innerText = "Ask";
            submitButton.addEventListener("click", () => {
                const query = inputField.value.trim();
                if (query) {
                    handleUserQuery(query);
                    inputField.value = "";
                }
            });

            inputBox.appendChild(inputField);
            inputBox.appendChild(submitButton);
            document.body.appendChild(inputBox);
        }
    }

    createQueryInput();
});
