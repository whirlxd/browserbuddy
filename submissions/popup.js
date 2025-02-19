document.addEventListener("DOMContentLoaded", function () {
    const amountInput = document.getElementById("amount");
    const descriptionInput = document.getElementById("description");
    const addExpenseBtn = document.getElementById("addExpense");
    const copyAllBtn = document.getElementById("copyAll");
    const exportCSVBtn = document.getElementById("exportCSV");
    const totalBtn = document.getElementById("calculateTotal");
    const expenseList = document.getElementById("expenseList");
    const totalAmountDisplay = document.getElementById("totalAmount");
    const dateDisplay = document.getElementById("dateDisplay");

    // Display Date in DD/MM/YYYY format
    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    dateDisplay.textContent = `Date: ${formattedDate}`;

    let expenses = [];

    function updateList() {
        expenseList.innerHTML = "";
        let total = 0;

        expenses.forEach((expense, index) => {
            const li = document.createElement("li");
            li.innerHTML = `
                <span class="expense-text">${expense.amount} - ${expense.description}</span>
                <button class="edit-amount" data-index="${index}">✏️</button>
                <button class="edit-desc" data-index="${index}">📝</button>
                <button class="delete" data-index="${index}">❌</button>
            `;
            total += parseFloat(expense.amount);
            expenseList.appendChild(li);
        });

        totalAmountDisplay.textContent = `Total - ${total}`;
    }

    addExpenseBtn.addEventListener("click", () => {
        const amount = amountInput.value.trim();
        const description = descriptionInput.value.trim();

        if (amount === "" || description === "" || isNaN(amount) || parseFloat(amount) < 0) return;

        expenses.push({ amount, description });
        updateList();
        amountInput.value = "";
        descriptionInput.value = "";
    });

    expenseList.addEventListener("click", (e) => {
        const index = e.target.dataset.index;
        if (e.target.classList.contains("delete")) {
            expenses.splice(index, 1);
            updateList();
        } else if (e.target.classList.contains("edit-amount")) {
            const newAmount = prompt("Edit amount:", expenses[index].amount);
            if (newAmount !== null && !isNaN(newAmount) && parseFloat(newAmount) >= 0) {
                expenses[index].amount = newAmount.trim();
                updateList();
            }
        } else if (e.target.classList.contains("edit-desc")) {
            const newDesc = prompt("Edit description:", expenses[index].description);
            if (newDesc !== null) {
                expenses[index].description = newDesc.trim();
                updateList();
            }
        }
    });

    copyAllBtn.addEventListener("click", () => {
        let text = `Date: ${formattedDate}\n\n`;
        expenses.forEach(expense => {
            text += `${expense.amount} - ${expense.description}\n`;
        });
        text += `\nTotal - ${expenses.reduce((sum, ex) => sum + parseFloat(ex.amount), 0)}`;
        
        navigator.clipboard.writeText(text).then(() => {
            alert("Copied to clipboard!");
        });
    });

    exportCSVBtn.addEventListener("click", () => {
        let csv = `Date,${formattedDate}\nAmount,Description\n`;
        expenses.forEach(exp => {
            csv += `${exp.amount},${exp.description}\n`;
        });

        const blob = new Blob([csv], { type: "text/csv" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "expenses.csv";
        link.click();
    });

    totalBtn.addEventListener("click", () => {
        const total = expenses.reduce((sum, ex) => sum + parseFloat(ex.amount), 0);
        alert(`Total Expenses: ${total}`);
    });
});
