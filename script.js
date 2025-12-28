// Data Structure
let transactions = [];
let shiftInfo = {
    employeeName: '',
    shiftStart: '',
    shiftEnd: ''
};
let currentFilter = 'all'; // Track current filter
let shiftHistory = []; // Store all completed shifts
let currentPage = 'current'; // Track current page
let fuelPrices = {
    normal: 106.39,
    xp95: 113.73,
    diesel: 90.00
}; // Default fuel prices

// IndexedDB setup
let db;
const DB_NAME = 'FuelRecordDB';
const DB_VERSION = 1;
const STORE_NAME = 'fuelData';

// Initialize IndexedDB
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => {
            console.error('IndexedDB error:', request.error);
            reject(request.error);
        };
        
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'key' });
            }
        };
    });
}

// Load data from localStorage on page load
window.addEventListener('DOMContentLoaded', async () => {
    try {
        await initDB();
        await loadData();
        updateDashboard();
        renderTransactions();
        displayShiftInfo();
        updateFilterCounts();
        renderHistory();
        loadFuelPrices();
        updatePetrolPriceFromType();
        
        // Set current date/time as default for shift start
        const now = new Date();
        const dateTimeString = now.toISOString().slice(0, 16);
        document.getElementById('shiftStart').value = dateTimeString;
        
        // Add event listeners for calculator
        document.getElementById('customerPrice').addEventListener('input', autoCalculateDiscount);
        
        // Auto-save every 30 seconds to ensure data persistence
        setInterval(() => {
            saveToIndexedDB();
        }, 30000);
        
    } catch (error) {
        console.error('Initialization error:', error);
        showMessage('App loaded. Using backup storage.', 'success');
    }
});

// Save shift information
function saveShiftInfo() {
    const employeeName = document.getElementById('employeeName').value.trim();
    const shiftStart = document.getElementById('shiftStart').value;
    const shiftEnd = document.getElementById('shiftEnd').value;
    
    if (!employeeName) {
        showMessage('Please enter employee name', 'error');
        return;
    }
    
    if (!shiftStart) {
        showMessage('Please select shift start time', 'error');
        return;
    }
    
    shiftInfo = {
        employeeName,
        shiftStart,
        shiftEnd
    };
    
    saveData();
    displayShiftInfo();
    showMessage('Shift information saved successfully!', 'success');
}

// Display shift information
function displayShiftInfo() {
    if (shiftInfo.employeeName) {
        document.getElementById('currentShift').classList.remove('hidden');
        document.getElementById('displayEmployeeName').textContent = shiftInfo.employeeName;
        document.getElementById('displayShiftStart').textContent = formatDateTime(shiftInfo.shiftStart);
        document.getElementById('displayShiftEnd').textContent = shiftInfo.shiftEnd ? formatDateTime(shiftInfo.shiftEnd) : 'Ongoing';
        
        // Update form fields
        document.getElementById('employeeName').value = shiftInfo.employeeName;
        document.getElementById('shiftStart').value = shiftInfo.shiftStart;
        document.getElementById('shiftEnd').value = shiftInfo.shiftEnd;
    }
}

// Calculate discount from petrol price and customer price
function calculateDiscount() {
    const petrolPrice = parseFloat(document.getElementById('petrolPrice').value) || 0;
    const customerPrice = parseFloat(document.getElementById('customerPrice').value) || 0;
    
    if (petrolPrice <= 0) {
        showMessage('Please set fuel prices in Settings first', 'error');
        return;
    }
    
    if (customerPrice <= 0) {
        showMessage('Please enter a valid customer price', 'error');
        return;
    }
    
    // Calculate: customer_price / fuel_price = discount
    const discount = customerPrice / petrolPrice;
    
    document.getElementById('calculatedDiscount').textContent = `₹${discount.toFixed(2)}`;
    document.getElementById('calculatedDiscount').classList.add('animate-pulse');
    
    setTimeout(() => {
        document.getElementById('calculatedDiscount').classList.remove('animate-pulse');
    }, 1000);
}

// Auto-calculate discount on input
function autoCalculateDiscount() {
    const petrolPrice = parseFloat(document.getElementById('petrolPrice').value) || 0;
    const customerPrice = parseFloat(document.getElementById('customerPrice').value) || 0;
    
    if (petrolPrice > 0 && customerPrice > 0) {
        // Calculate: customer_price / fuel_price = discount
        const discount = customerPrice / petrolPrice;
        document.getElementById('calculatedDiscount').textContent = `₹${discount.toFixed(2)}`;
        
        // Calculate fuel to give: customer_price + discount
        const fuelToGive = customerPrice + discount;
        document.getElementById('fuelToGive').textContent = `₹${fuelToGive.toFixed(2)}`;
        document.getElementById('fuelToGive').classList.add('animate-pulse');
        setTimeout(() => {
            document.getElementById('fuelToGive').classList.remove('animate-pulse');
        }, 500);
    } else {
        document.getElementById('calculatedDiscount').textContent = '₹0.00';
        document.getElementById('fuelToGive').textContent = '₹0.00';
    }
}

// Update petrol price based on selected fuel type
function updatePetrolPriceFromType() {
    const fuelType = document.getElementById('fuelType').value;
    let price = 0;
    
    if (fuelType === 'normal') {
        price = fuelPrices.normal;
    } else if (fuelType === 'xp95') {
        price = fuelPrices.xp95;
    } else if (fuelType === 'diesel') {
        price = fuelPrices.diesel;
    }
    
    document.getElementById('petrolPrice').value = price.toFixed(2);
    autoCalculateDiscount();
}

// Update petrol price for liters method
function updatePetrolPriceFromTypeLiters() {
    const fuelType = document.getElementById('fuelTypeLiters').value;
    let price = 0;
    
    if (fuelType === 'normal') {
        price = fuelPrices.normal;
    } else if (fuelType === 'xp95') {
        price = fuelPrices.xp95;
    } else if (fuelType === 'diesel') {
        price = fuelPrices.diesel;
    }
    
    document.getElementById('petrolPriceLiters').value = price.toFixed(2);
    calculateByLiters();
}

// Toggle between calculation methods
function toggleCalculationMethod() {
    const method = document.querySelector('input[name="calcMethod"]:checked').value;
    
    if (method === 'price') {
        document.getElementById('priceMethod').classList.remove('hidden');
        document.getElementById('litersMethod').classList.add('hidden');
        document.getElementById('litersMethodInfo').classList.add('hidden');
    } else {
        document.getElementById('priceMethod').classList.add('hidden');
        document.getElementById('litersMethod').classList.remove('hidden');
        document.getElementById('litersMethodInfo').classList.remove('hidden');
        updatePetrolPriceFromTypeLiters();
        calculateByLiters();
    }
}

// Calculate discount by liters (1 liter = 1 rupee discount by default)
function calculateByLiters() {
    const liters = parseFloat(document.getElementById('litersAmount').value) || 0;
    const discountPerLiter = parseFloat(document.getElementById('discountPerLiter').value) || 1;
    const fuelPrice = parseFloat(document.getElementById('petrolPriceLiters').value) || 0;
    
    if (liters > 0 && fuelPrice > 0) {
        const totalDiscount = liters * discountPerLiter;
        const totalAmount = liters * fuelPrice;
        const fuelToGive = totalAmount + totalDiscount;
        
        document.getElementById('calculatedDiscountLiters').textContent = `₹${totalDiscount.toFixed(2)}`;
        document.getElementById('totalAmountLiters').textContent = `₹${totalAmount.toFixed(2)}`;
        document.getElementById('fuelToGiveLiters').textContent = `₹${fuelToGive.toFixed(2)}`;
    } else {
        document.getElementById('calculatedDiscountLiters').textContent = '₹0.00';
        document.getElementById('totalAmountLiters').textContent = '₹0.00';
        document.getElementById('fuelToGiveLiters').textContent = '₹0.00';
    }
}

// Use calculated discount from liters method
function useCalculatedDiscountLiters() {
    const discountText = document.getElementById('calculatedDiscountLiters').textContent;
    const discountValue = discountText.replace('₹', '');
    
    if (discountValue === '0.00') {
        showMessage('Please enter liters first', 'error');
        return;
    }
    
    // Set the discount in the transaction form
    document.getElementById('discountAmount').value = discountValue;
    
    // Set the total amount as payment amount
    const amountText = document.getElementById('totalAmountLiters').textContent;
    const amountValue = amountText.replace('₹', '');
    if (amountValue) {
        document.getElementById('paymentAmount').value = amountValue;
    }
    
    showMessage('Discount and amount added to transaction form!', 'success');
}

// Use calculated discount in the transaction form
function useCalculatedDiscount() {
    const calculatedText = document.getElementById('calculatedDiscount').textContent;
    const discountValue = calculatedText.replace('₹', '');
    
    if (discountValue === '0.00') {
        showMessage('Please calculate discount first', 'error');
        return;
    }
    
    // Set the discount in the transaction form
    document.getElementById('discountAmount').value = discountValue;
    
    // Also set the customer price as payment amount
    const customerPrice = document.getElementById('customerPrice').value;
    if (customerPrice) {
        document.getElementById('paymentAmount').value = customerPrice;
    }
    
    showMessage('Discount and amount added to transaction form!', 'success');
}

// Add transaction
function addTransaction() {
    const paymentAmount = parseFloat(document.getElementById('paymentAmount').value) || 0;
    const discountAmount = parseFloat(document.getElementById('discountAmount').value) || 0;
    const paymentMethod = document.getElementById('paymentMethod').value;
    
    // Validation - Only discount is required now
    if (paymentAmount === 0 && discountAmount === 0) {
        showMessage('Please enter either payment amount or discount amount', 'error');
        return;
    }
    
    if (discountAmount < 0) {
        showMessage('Discount cannot be negative', 'error');
        return;
    }
    
    // Create transaction object
    const transaction = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        paymentMethod,
        amount: paymentAmount,
        discount: discountAmount
    };
    
    // Add to transactions array
    transactions.unshift(transaction);
    
    // Save to localStorage
    saveData();
    
    // Update UI
    updateDashboard();
    renderTransactions();
    updateFilterCounts();
    
    // Clear form
    document.getElementById('paymentAmount').value = '';
    document.getElementById('discountAmount').value = '';
    document.getElementById('paymentMethod').value = 'cash';
    
    // Show success message
    showMessage('Transaction added successfully!', 'success');
}

// Update dashboard totals
function updateDashboard() {
    let cashTotal = 0;
    let cashDiscount = 0;
    let cardTotal = 0;
    let cardDiscount = 0;
    let onlineTotal = 0;
    let onlineDiscount = 0;
    
    transactions.forEach(transaction => {
        if (transaction.paymentMethod === 'cash') {
            cashTotal += transaction.amount;
            cashDiscount += transaction.discount;
        } else if (transaction.paymentMethod === 'card') {
            cardTotal += transaction.amount;
            cardDiscount += transaction.discount;
            onlineDiscount += transaction.discount; // Card discount goes to online discount
        } else if (transaction.paymentMethod === 'online') {
            onlineTotal += transaction.amount;
            onlineDiscount += transaction.discount;
        }
    });
    
    // Update cash card
    document.getElementById('cashTotal').textContent = `₹${cashTotal.toFixed(2)}`;
    document.getElementById('cashDiscount').textContent = cashDiscount.toFixed(2);
    
    // Update card payment card
    document.getElementById('cardTotal').textContent = `₹${cardTotal.toFixed(2)}`;
    document.getElementById('cardDiscount').textContent = cardDiscount.toFixed(2);
    
    // Update online card
    document.getElementById('onlineTotal').textContent = `₹${onlineTotal.toFixed(2)}`;
    document.getElementById('onlineDiscount').textContent = onlineDiscount.toFixed(2);
    
    // Update grand total
    const grandTotal = cashTotal + cardTotal + onlineTotal;
    const totalDiscount = cashDiscount + onlineDiscount; // Cash discount + Online discount (which includes card)
    
    document.getElementById('grandTotal').textContent = `₹${grandTotal.toFixed(2)}`;
    document.getElementById('totalDiscount').textContent = grandTotal.toFixed(2);
    
    // Update total discount given (new prominent display)
    document.getElementById('totalDiscountGiven').textContent = `₹${totalDiscount.toFixed(2)}`;
    
    // Update filter counts
    updateFilterCounts();
}

// Render transactions table
function renderTransactions() {
    const tableBody = document.getElementById('transactionTableBody');
    
    // Filter transactions based on current filter
    let filteredTransactions = transactions;
    if (currentFilter !== 'all') {
        filteredTransactions = transactions.filter(t => t.paymentMethod === currentFilter);
    }
    
    if (filteredTransactions.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                    ${currentFilter === 'all' ? 'No transactions yet. Add your first transaction above!' : `No ${currentFilter} transactions found.`}
                </td>
            </tr>
        `;
        updateFilterSummary(filteredTransactions);
        return;
    }
    
    tableBody.innerHTML = filteredTransactions.map(transaction => `
        <tr class="border-b border-gray-200 transaction-row">
            <td class="px-4 py-3 text-sm text-gray-700">${formatDateTime(transaction.timestamp)}</td>
            <td class="px-4 py-3">
                <select onchange="updatePaymentMethod(${transaction.id}, this.value)" 
                        class="payment-method-select px-3 py-1 rounded border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    <option value="cash" ${transaction.paymentMethod === 'cash' ? 'selected' : ''}>💵 Cash</option>
                    <option value="card" ${transaction.paymentMethod === 'card' ? 'selected' : ''}>💳 Card</option>
                    <option value="online" ${transaction.paymentMethod === 'online' ? 'selected' : ''}>📱 Online</option>
                </select>
            </td>
            <td class="px-4 py-3 text-right text-sm font-semibold text-gray-900">₹${transaction.amount.toFixed(2)}</td>
            <td class="px-4 py-3 text-right text-sm font-semibold text-green-600">₹${transaction.discount.toFixed(2)}</td>
            <td class="px-4 py-3 text-center">
                <button onclick="deleteTransaction(${transaction.id})" 
                        class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition duration-200 text-sm">
                    Delete
                </button>
            </td>
        </tr>
    `).join('');
    
    updateFilterSummary(filteredTransactions);
}

// Delete transaction
function deleteTransaction(id) {
    if (confirm('Are you sure you want to delete this transaction?')) {
        transactions = transactions.filter(t => t.id !== id);
        saveData();
        updateDashboard();
        renderTransactions();
        updateFilterCounts();
        showMessage('Transaction deleted successfully!', 'success');
    }
}

// Update payment method for a transaction
function updatePaymentMethod(id, newMethod) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;
    
    const oldMethod = transaction.paymentMethod;
    transaction.paymentMethod = newMethod;
    
    saveData();
    updateDashboard();
    renderTransactions();
    updateFilterCounts();
    
    showMessage(`Payment method updated from ${oldMethod} to ${newMethod}!`, 'success');
}

// Filter transactions
function filterTransactions(method) {
    currentFilter = method;
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`filter${method.charAt(0).toUpperCase() + method.slice(1)}`).classList.add('active');
    
    // Re-render transactions
    renderTransactions();
}

// Update filter counts
function updateFilterCounts() {
    const cashCount = transactions.filter(t => t.paymentMethod === 'cash').length;
    const cardCount = transactions.filter(t => t.paymentMethod === 'card').length;
    const onlineCount = transactions.filter(t => t.paymentMethod === 'online').length;
    const allCount = transactions.length;
    
    document.getElementById('countCash').textContent = cashCount;
    document.getElementById('countCard').textContent = cardCount;
    document.getElementById('countOnline').textContent = onlineCount;
    document.getElementById('countAll').textContent = allCount;
}

// Update filter summary
function updateFilterSummary(filteredTransactions) {
    const summaryDiv = document.getElementById('filterSummary');
    
    if (currentFilter === 'all' || filteredTransactions.length === 0) {
        summaryDiv.classList.add('hidden');
        return;
    }
    
    summaryDiv.classList.remove('hidden');
    
    let totalAmount = 0;
    let totalDiscount = 0;
    
    filteredTransactions.forEach(t => {
        totalAmount += t.amount;
        totalDiscount += t.discount;
    });
    
    document.getElementById('filteredTotal').textContent = totalAmount.toFixed(2);
    document.getElementById('filteredDiscount').textContent = totalDiscount.toFixed(2);
    document.getElementById('filteredCount').textContent = filteredTransactions.length;
}

// Clear all data
function clearAllData() {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone!')) {
        transactions = [];
        shiftInfo = {
            employeeName: '',
            shiftStart: '',
            shiftEnd: ''
        };
        currentFilter = 'all';
        
        // Clear form fields
        document.getElementById('employeeName').value = '';
        document.getElementById('shiftStart').value = '';
        document.getElementById('shiftEnd').value = '';
        document.getElementById('currentShift').classList.add('hidden');
        
        // Reset filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById('filterAll').classList.add('active');
        
        saveData();
        updateDashboard();
        renderTransactions();
        updateFilterCounts();
        showMessage('All data cleared successfully!', 'success');
    }
}

// Save data to localStorage
function saveData() {
    try {
        // Save to localStorage (backup)
        localStorage.setItem('fuelRecordTransactions', JSON.stringify(transactions));
        localStorage.setItem('fuelRecordShiftInfo', JSON.stringify(shiftInfo));
        localStorage.setItem('fuelRecordShiftHistory', JSON.stringify(shiftHistory));
        localStorage.setItem('fuelRecordPrices', JSON.stringify(fuelPrices));
    } catch (e) {
        console.error('LocalStorage save error:', e);
    }
    
    // Save to IndexedDB (persistent storage)
    saveToIndexedDB();
}

// Save to IndexedDB with error handling
function saveToIndexedDB() {
    if (!db) {
        console.warn('IndexedDB not available');
        return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            const allData = {
                key: 'fuelRecordData',
                transactions: transactions,
                shiftInfo: shiftInfo,
                shiftHistory: shiftHistory,
                fuelPrices: fuelPrices,
                lastUpdated: new Date().toISOString()
            };
            
            const request = store.put(allData);
            
            request.onsuccess = () => {
                console.log('Data saved to IndexedDB successfully');
                resolve();
            };
            
            request.onerror = () => {
                console.error('IndexedDB save error:', request.error);
                reject(request.error);
            };
            
        } catch (error) {
            console.error('IndexedDB transaction error:', error);
            reject(error);
        }
    });
}

// Load data from localStorage
function loadData() {
    return new Promise(async (resolve) => {
        try {
            // Try to load from IndexedDB first (persistent storage)
            const indexedDBData = await loadFromIndexedDB();
            
            if (indexedDBData && indexedDBData.transactions) {
                console.log('Loading data from IndexedDB');
                transactions = indexedDBData.transactions || [];
                shiftInfo = indexedDBData.shiftInfo || { employeeName: '', shiftStart: '', shiftEnd: '' };
                shiftHistory = indexedDBData.shiftHistory || [];
                fuelPrices = indexedDBData.fuelPrices || { normal: 106.39, xp95: 113.73, diesel: 90.00 };
                
                // Also save to localStorage as backup
                try {
                    localStorage.setItem('fuelRecordTransactions', JSON.stringify(transactions));
                    localStorage.setItem('fuelRecordShiftInfo', JSON.stringify(shiftInfo));
                    localStorage.setItem('fuelRecordShiftHistory', JSON.stringify(shiftHistory));
                    localStorage.setItem('fuelRecordPrices', JSON.stringify(fuelPrices));
                } catch (e) {
                    console.error('LocalStorage backup failed:', e);
                }
            } else {
                console.log('Loading data from localStorage (fallback)');
                // Fallback to localStorage
                const savedTransactions = localStorage.getItem('fuelRecordTransactions');
                const savedShiftInfo = localStorage.getItem('fuelRecordShiftInfo');
                const savedShiftHistory = localStorage.getItem('fuelRecordShiftHistory');
                const savedFuelPrices = localStorage.getItem('fuelRecordPrices');
                
                if (savedTransactions) {
                    transactions = JSON.parse(savedTransactions);
                }
                
                if (savedShiftInfo) {
                    shiftInfo = JSON.parse(savedShiftInfo);
                }
                
                if (savedShiftHistory) {
                    shiftHistory = JSON.parse(savedShiftHistory);
                }
                
                if (savedFuelPrices) {
                    fuelPrices = JSON.parse(savedFuelPrices);
                }
                
                // Migrate to IndexedDB for future persistence
                await saveToIndexedDB();
                console.log('Data migrated to IndexedDB');
            }
        } catch (error) {
            console.error('Load data error:', error);
        }
        
        resolve();
    });
}

// Load from IndexedDB
function loadFromIndexedDB() {
    return new Promise((resolve) => {
        if (!db) {
            resolve(null);
            return;
        }
        
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get('fuelRecordData');
        
        request.onsuccess = () => {
            resolve(request.result);
        };
        
        request.onerror = () => {
            resolve(null);
        };
    });
}

// Utility: Format date and time
function formatDateTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleString('en-IN', options);
}

// Utility: Get payment icon
function getPaymentIcon(method) {
    const icons = {
        cash: '💵',
        card: '💳',
        online: '📱'
    };
    return icons[method] || '';
}

// Show message notification
function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to add transaction
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        addTransaction();
    }
});

// Export data functionality (bonus feature)
function exportData() {
    const dataStr = JSON.stringify({
        shiftInfo,
        transactions,
        exportDate: new Date().toISOString()
    }, null, 2);
    
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fuel-records-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

// End shift and save summary
function endShift() {
    if (!shiftInfo.employeeName || !shiftInfo.shiftStart) {
        showMessage('Please save shift information first', 'error');
        return;
    }
    
    if (transactions.length === 0) {
        if (!confirm('No transactions recorded. Do you still want to end the shift?')) {
            return;
        }
    }
    
    // Set end time to now if not set
    const endTime = document.getElementById('shiftEnd').value || new Date().toISOString().slice(0, 16);
    
    // Calculate totals
    let cashTotal = 0, cashDiscount = 0;
    let cardTotal = 0, cardDiscount = 0;
    let onlineTotal = 0, onlineDiscount = 0;
    
    transactions.forEach(transaction => {
        if (transaction.paymentMethod === 'cash') {
            cashTotal += transaction.amount;
            cashDiscount += transaction.discount;
        } else if (transaction.paymentMethod === 'card') {
            cardTotal += transaction.amount;
            cardDiscount += transaction.discount;
            onlineDiscount += transaction.discount;
        } else if (transaction.paymentMethod === 'online') {
            onlineTotal += transaction.amount;
            onlineDiscount += transaction.discount;
        }
    });
    
    const grandTotal = cashTotal + cardTotal + onlineTotal;
    const totalDiscount = cashDiscount + onlineDiscount;
    
    // Create shift summary
    const shiftSummary = {
        id: Date.now(),
        employeeName: shiftInfo.employeeName,
        shiftStart: shiftInfo.shiftStart,
        shiftEnd: endTime,
        transactions: [...transactions],
        summary: {
            cashTotal,
            cashDiscount,
            cardTotal,
            cardDiscount,
            onlineTotal,
            onlineDiscount: onlineDiscount - cardDiscount, // Pure online discount
            grandTotal,
            totalDiscount,
            totalTransactions: transactions.length
        }
    };
    
    // Add to history
    shiftHistory.unshift(shiftSummary);
    
    // Clear current shift data
    transactions = [];
    shiftInfo = {
        employeeName: '',
        shiftStart: '',
        shiftEnd: ''
    };
    currentFilter = 'all';
    
    // Clear form
    document.getElementById('employeeName').value = '';
    document.getElementById('shiftStart').value = '';
    document.getElementById('shiftEnd').value = '';
    document.getElementById('currentShift').classList.add('hidden');
    
    // Reset filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById('filterAll').classList.add('active');
    
    // Save and update
    saveData();
    updateDashboard();
    renderTransactions();
    updateFilterCounts();
    renderHistory();
    
    showMessage('Shift ended successfully! Summary saved to history.', 'success');
    
    // Show shift summary modal
    showShiftSummaryModal(shiftSummary);
}

// Show shift summary modal
function showShiftSummaryModal(summary) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 class="text-3xl font-bold text-gray-800 mb-6 text-center">🎉 Shift Summary</h2>
            <div class="space-y-4">
                <div class="bg-indigo-50 p-4 rounded-lg">
                    <p class="text-lg"><strong>Employee:</strong> ${summary.employeeName}</p>
                    <p class="text-sm text-gray-600"><strong>Start:</strong> ${formatDateTime(summary.shiftStart)}</p>
                    <p class="text-sm text-gray-600"><strong>End:</strong> ${formatDateTime(summary.shiftEnd)}</p>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                        <h3 class="font-semibold text-gray-700 mb-2">💵 Cash</h3>
                        <p class="text-2xl font-bold text-green-600">₹${summary.summary.cashTotal.toFixed(2)}</p>
                        <p class="text-sm text-gray-600">Discount: ₹${summary.summary.cashDiscount.toFixed(2)}</p>
                    </div>
                    <div class="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500">
                        <h3 class="font-semibold text-gray-700 mb-2">💳 Card</h3>
                        <p class="text-2xl font-bold text-purple-600">₹${summary.summary.cardTotal.toFixed(2)}</p>
                        <p class="text-sm text-gray-600">Discount: ₹${summary.summary.cardDiscount.toFixed(2)}</p>
                    </div>
                    <div class="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                        <h3 class="font-semibold text-gray-700 mb-2">📱 Online</h3>
                        <p class="text-2xl font-bold text-blue-600">₹${summary.summary.onlineTotal.toFixed(2)}</p>
                        <p class="text-sm text-gray-600">Discount: ₹${summary.summary.onlineDiscount.toFixed(2)}</p>
                    </div>
                    <div class="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500">
                        <h3 class="font-semibold text-gray-700 mb-2">💰 Total</h3>
                        <p class="text-2xl font-bold text-orange-600">₹${summary.summary.grandTotal.toFixed(2)}</p>
                        <p class="text-sm text-gray-600">Discount: ₹${summary.summary.totalDiscount.toFixed(2)}</p>
                    </div>
                </div>
                
                <div class="bg-yellow-50 p-4 rounded-lg text-center">
                    <p class="text-lg font-semibold text-gray-700">Total Transactions: <span class="text-2xl text-yellow-600">${summary.summary.totalTransactions}</span></p>
                </div>
            </div>
            
            <div class="mt-6 flex gap-3">
                <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                        class="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition duration-200 font-medium">
                    Close
                </button>
                <button onclick="showPage('history'); this.parentElement.parentElement.parentElement.remove();" 
                        class="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition duration-200 font-medium">
                    View History
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Show/hide pages
function showPage(page) {
    currentPage = page;
    
    if (page === 'current') {
        document.getElementById('currentPage').classList.remove('hidden');
        document.getElementById('historyPage').classList.add('hidden');
        document.getElementById('settingsPage').classList.add('hidden');
        document.getElementById('tabCurrent').classList.add('active');
        document.getElementById('tabHistory').classList.remove('active');
        document.getElementById('tabSettings').classList.remove('active');
    } else if (page === 'history') {
        document.getElementById('currentPage').classList.add('hidden');
        document.getElementById('historyPage').classList.remove('hidden');
        document.getElementById('settingsPage').classList.add('hidden');
        document.getElementById('tabCurrent').classList.remove('active');
        document.getElementById('tabHistory').classList.add('active');
        document.getElementById('tabSettings').classList.remove('active');
        renderHistory();
    } else if (page === 'settings') {
        document.getElementById('currentPage').classList.add('hidden');
        document.getElementById('historyPage').classList.add('hidden');
        document.getElementById('settingsPage').classList.remove('hidden');
        document.getElementById('tabCurrent').classList.remove('active');
        document.getElementById('tabHistory').classList.remove('active');
        document.getElementById('tabSettings').classList.add('active');
        displayCurrentPrices();
    }
}

// Render history page
function renderHistory() {
    const historyContent = document.getElementById('historyContent');
    
    if (shiftHistory.length === 0) {
        historyContent.innerHTML = '<p class="text-center text-gray-500 py-8">No shift history available yet.</p>';
        return;
    }
    
    historyContent.innerHTML = shiftHistory.map(shift => `
        <div class="shift-summary-card bg-white border rounded-lg p-6 mb-6 shadow-md hover:shadow-lg transition-all">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="text-xl font-bold text-gray-800">👤 ${shift.employeeName}</h3>
                    <p class="text-sm text-gray-600 mt-1">
                        <strong>Start:</strong> ${formatDateTime(shift.shiftStart)}<br>
                        <strong>End:</strong> ${formatDateTime(shift.shiftEnd)}
                    </p>
                </div>
                <div class="flex gap-2">
                    <button onclick="exportShiftToPDF(${shift.id})" 
                            class="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition duration-200 text-sm">
                        📝 PDF
                    </button>
                    <button onclick="deleteShift(${shift.id})" 
                            class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition duration-200 text-sm">
                        Delete
                    </button>
                </div>
            </div>
            
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div class="bg-green-50 p-3 rounded border-l-4 border-green-500">
                    <p class="text-xs text-gray-600 font-semibold">💵 Cash</p>
                    <p class="text-lg font-bold text-green-600">₹${shift.summary.cashTotal.toFixed(2)}</p>
                    <p class="text-xs text-gray-500">Discount: ₹${shift.summary.cashDiscount.toFixed(2)}</p>
                </div>
                <div class="bg-purple-50 p-3 rounded border-l-4 border-purple-500">
                    <p class="text-xs text-gray-600 font-semibold">💳 Card</p>
                    <p class="text-lg font-bold text-purple-600">₹${shift.summary.cardTotal.toFixed(2)}</p>
                    <p class="text-xs text-gray-500">Discount: ₹${shift.summary.cardDiscount.toFixed(2)}</p>
                </div>
                <div class="bg-blue-50 p-3 rounded border-l-4 border-blue-500">
                    <p class="text-xs text-gray-600 font-semibold">📱 Online</p>
                    <p class="text-lg font-bold text-blue-600">₹${shift.summary.onlineTotal.toFixed(2)}</p>
                    <p class="text-xs text-gray-500">Discount: ₹${shift.summary.onlineDiscount.toFixed(2)}</p>
                </div>
                <div class="bg-orange-50 p-3 rounded border-l-4 border-orange-500">
                    <p class="text-xs text-gray-600 font-semibold">💰 Total</p>
                    <p class="text-lg font-bold text-orange-600">₹${shift.summary.grandTotal.toFixed(2)}</p>
                    <p class="text-xs text-gray-500">Discount: ₹${shift.summary.totalDiscount.toFixed(2)}</p>
                </div>
            </div>
            
            <div class="flex justify-between items-center pt-4 border-t">
                <p class="text-sm text-gray-600"><strong>Total Transactions:</strong> ${shift.summary.totalTransactions}</p>
                <button onclick="viewShiftDetails(${shift.id})" 
                        class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition duration-200 text-sm font-medium">
                    View Details
                </button>
            </div>
        </div>
    `).join('');
}

// View shift details
function viewShiftDetails(shiftId) {
    const shift = shiftHistory.find(s => s.id === shiftId);
    if (!shift) return;
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-gray-800">📋 Shift Details</h2>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                        class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>
            
            <div class="bg-indigo-50 p-4 rounded-lg mb-4">
                <p class="text-lg"><strong>Employee:</strong> ${shift.employeeName}</p>
                <p class="text-sm text-gray-600"><strong>Start:</strong> ${formatDateTime(shift.shiftStart)} | <strong>End:</strong> ${formatDateTime(shift.shiftEnd)}</p>
            </div>
            
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead>
                        <tr class="bg-gray-100">
                            <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">Time</th>
                            <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">Method</th>
                            <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                            <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">Discount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${shift.transactions.map(t => `
                            <tr class="border-b border-gray-200">
                                <td class="px-4 py-3 text-sm text-gray-700">${formatDateTime(t.timestamp)}</td>
                                <td class="px-4 py-3">
                                    <span class="payment-badge ${t.paymentMethod}">
                                        ${getPaymentIcon(t.paymentMethod)} ${t.paymentMethod}
                                    </span>
                                </td>
                                <td class="px-4 py-3 text-right text-sm font-semibold text-gray-900">₹${t.amount.toFixed(2)}</td>
                                <td class="px-4 py-3 text-right text-sm font-semibold text-green-600">₹${t.discount.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Delete shift from history
function deleteShift(shiftId) {
    if (confirm('Are you sure you want to delete this shift record?')) {
        shiftHistory = shiftHistory.filter(s => s.id !== shiftId);
        saveData();
        renderHistory();
        showMessage('Shift record deleted successfully!', 'success');
    }
}

// Clear history
function clearHistory() {
    if (confirm('Are you sure you want to clear all shift history? This action cannot be undone!')) {
        shiftHistory = [];
        saveData();
        renderHistory();
        showMessage('Shift history cleared successfully!', 'success');
    }
}

// Download Bengali User Guide
function downloadBengaliGuide() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    
    let yPos = 20;
    const lineHeight = 7;
    const pageHeight = 280;
    
    // Helper function to add new page if needed
    function checkPageBreak(neededSpace = 15) {
        if (yPos + neededSpace > pageHeight) {
            doc.addPage();
            yPos = 20;
        }
    }
    
    // Title
    doc.setFontSize(24);
    doc.setTextColor(79, 70, 229);
    doc.text('ফিউয়েল রেকর্ড বুক', 105, yPos, { align: 'center' });
    yPos += 10;
    doc.setFontSize(16);
    doc.setTextColor(100, 100, 100);
    doc.text('ব্যবহারকারী গাইড', 105, yPos, { align: 'center' });
    yPos += 15;
    
    // Introduction
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('ভূমিকা', 15, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const introText = 'এই অ্যাপ্লিকেশনটি পেট্রোল পাম্পের দৈনন্দিন লেনদেন, ছাড়, এবখ শিফট ম্যানেজমেন্টের জন্য তৈরি\nকরা হয়েছে। এটি খুব সহজ এবং ব্যবহার উপযোগী।';
    doc.text(introText, 15, yPos, { maxWidth: 180 });
    yPos += 20;
    
    checkPageBreak();
    
    // Section 1: Getting Started
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229);
    doc.text('১. শুরু করা', 15, yPos);
    yPos += 8;
    
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text('শিফট তথ্য সেট করুন:', 15, yPos);
    yPos += 6;
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('• কর্মচারীর নাম লিখুন', 20, yPos);
    yPos += 5;
    doc.text('• শিফট শুরুর সময় নির্বাচন করুন', 20, yPos);
    yPos += 5;
    doc.text('• শিফট শেষের সময় নির্বাচন করুন', 20, yPos);
    yPos += 5;
    doc.text('• "Save Shift Info" বাটনে ক্লিক করুন', 20, yPos);
    yPos += 10;
    
    checkPageBreak();
    
    // Section 2: Fuel Prices
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229);
    doc.text('২. ফিউয়েল দাম সেট করা', 15, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('• Settings ট্যাবে যান', 20, yPos);
    yPos += 5;
    doc.text('• তিন ধরনের ফিউয়েলের দাম দিন:', 20, yPos);
    yPos += 5;
    doc.text('  - Normal Petrol (সাধারণ পেট্রোল)', 25, yPos);
    yPos += 5;
    doc.text('  - XP95 (Speed পেট্রোল)', 25, yPos);
    yPos += 5;
    doc.text('  - Diesel (ডিজেল)', 25, yPos);
    yPos += 5;
    doc.text('• "Save Fuel Prices" বাটনে ক্লিক করুন', 20, yPos);
    yPos += 10;
    
    checkPageBreak();
    
    // Section 3: Discount Calculator
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229);
    doc.text('৩. ছাড় ক্যালকুলেটর', 15, yPos);
    yPos += 8;
    
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text('দুই ধরনের গণনা:', 15, yPos);
    yPos += 7;
    
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('A) গ্রাহকের দাম অনুযায়ী:', 20, yPos);
    yPos += 5;
    doc.text('  1. Fuel Type নির্বাচন করুন', 25, yPos);
    yPos += 5;
    doc.text('  2. গ্রাহকের দেওয়া টাকা লিখুন', 25, yPos);
    yPos += 5;
    doc.text('  3. ছাড় অটোম্যাটিক গণনা হবে', 25, yPos);
    yPos += 5;
    doc.text('  4. "ফিউয়েল টু গিভ" দেখুন (গ্রাহককে এই পরিমাণ দিতে হবে)', 25, yPos);
    yPos += 7;
    
    doc.text('B) লিটার অনুযায়ী:', 20, yPos);
    yPos += 5;
    doc.text('  1. Fuel Type নির্বাচন করুন', 25, yPos);
    yPos += 5;
    doc.text('  2. লিটার সখ ্যা লিখুন', 25, yPos);
    yPos += 5;
    doc.text('  3. প্রতি লিটার ছাড় লিখুন (ডিফল্ট: ১ টাকা)', 25, yPos);
    yPos += 5;
    doc.text('  4. মোট ছাড় এবং "ফিউয়েল টু গিভ" দেখুন', 25, yPos);
    yPos += 10;
    
    checkPageBreak(30);
    
    // Section 4: Adding Transactions
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229);
    doc.text('৪. লেনদেন যুক্ত করা', 15, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('• ছাড় ক্যালকুলেটর ব্যবহার করে ছাড় গণনা করুন', 20, yPos);
    yPos += 5;
    doc.text('• "Use Discount" বাটনে ক্লিক করুন', 20, yPos);
    yPos += 5;
    doc.text('• Payment Method নির্বাচন করুন: Cash/Card/Online', 20, yPos);
    yPos += 5;
    doc.text('• "Add Transaction" বাটনে ক্লিক করুন', 20, yPos);
    yPos += 10;
    
    checkPageBreak();
    
    // Section 5: Payment Methods
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229);
    doc.text('৫. পেমেন্ট মেথড', 15, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('• Cash: নগদ টাকার লেনদেন', 20, yPos);
    yPos += 5;
    doc.text('• Card: কার্ডের মাধ্যমে পেমেন্ট', 20, yPos);
    yPos += 5;
    doc.text('• Online: অনলাইন পেমেন্ট (UPI/মোবাইল ব্যাংকিং)', 20, yPos);
    yPos += 7;
    
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text('গুরুত্বপূর্ণ:', 20, yPos);
    yPos += 5;
    doc.setFontSize(10);
    doc.setTextColor(220, 38, 38);
    doc.text('• Card এবং Online ছাড় "Online Discount"-এ যুক্ত হয়', 25, yPos);
    yPos += 5;
    doc.text('• শুধু Cash ছাড় "Cash Discount"-এ যুক্ত হয়', 25, yPos);
    yPos += 10;
    
    checkPageBreak();
    
    // Section 6: Transaction History
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229);
    doc.text('৬. লেনদেনের ইতিহাস', 15, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('• সব লেনদেন টেবিলে দেখা যাবে', 20, yPos);
    yPos += 5;
    doc.text('• Filter ব্যবহার করে Cash/Card/Online আলাদা দেখুন', 20, yPos);
    yPos += 5;
    doc.text('• Payment Method পরিবর্তন করতে পারবেন', 20, yPos);
    yPos += 5;
    doc.text('• Delete বাটনে ভুল এন্ট্রি মুছে ফেলুন', 20, yPos);
    yPos += 10;
    
    checkPageBreak();
    
    // Section 7: Ending Shift
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229);
    doc.text('৭. শিফট শেষ করা', 15, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('• শিফট শেষে "End Shift" বাটনে ক্লিক করুন', 20, yPos);
    yPos += 5;
    doc.text('• একটি Summary পপ-আপ আসবে', 20, yPos);
    yPos += 5;
    doc.text('• সম্পূর্ণ শিফটের তথ্য সেখানে থাকবে', 20, yPos);
    yPos += 5;
    doc.text('• ডেটা অটোম্যাটিক History-তে সেভ হবে', 20, yPos);
    yPos += 10;
    
    checkPageBreak();
    
    // Section 8: Viewing History
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229);
    doc.text('৮. শিফট ইতিহাস দেখা', 15, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('• "All Shifts History" ট্যাবে ক্লিক করুন', 20, yPos);
    yPos += 5;
    doc.text('• সব শিফটের সংক্ষিপ্ত তথ্য দেখতে পারবেন', 20, yPos);
    yPos += 5;
    doc.text('• "View Details" বাটনে সম্পূর্ণ লেনদেন দেখুন', 20, yPos);
    yPos += 5;
    doc.text('• "PDF" বাটনে রিপোর্ট ডাউনলোড করুন', 20, yPos);
    yPos += 10;
    
    checkPageBreak();
    
    // Section 9: Data Backup
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229);
    doc.text('৯. ডেটা ব্যাকআপ', 15, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('• Settings ট্যাবে যান', 20, yPos);
    yPos += 5;
    doc.text('• "Export All Data" বাটনে ক্লিক করে ব্যাকআপ নিন', 20, yPos);
    yPos += 5;
    doc.text('• JSON ফাইল ডাউনলোড হবে', 20, yPos);
    yPos += 5;
    doc.text('• অন্য ব্রাউজারে "Import Data" দিয়ে পুনরায় লোড করুন', 20, yPos);
    yPos += 10;
    
    checkPageBreak(30);
    
    // Section 10: Tips
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229);
    doc.text('১০. গুরুত্বপূর্ণ টিপস', 15, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('• প্রতিদিন শিফট শেষে PDF রিপোর্ট ডাউনলোড করুন', 20, yPos);
    yPos += 5;
    doc.text('• সাপ্তাহিক ডেটা এক্সপোর্ট করে সেভ করে রাখুন', 20, yPos);
    yPos += 5;
    doc.text('• ছাড় দেওয়ার আগে Calculator ব্যবহার করুন', 20, yPos);
    yPos += 5;
    doc.text('• "ফিউয়েল টু গিভ" দেখে গ্রাহককে দিন', 20, yPos);
    yPos += 5;
    doc.text('• ভুল হলে Payment Method পরিবর্তন করতে পারবেন', 20, yPos);
    yPos += 5;
    doc.text('• ডেটা অটোম্যাটিক সেভ হয় (IndexedDB)', 20, yPos);
    yPos += 15;
    
    checkPageBreak();
    
    // Examples
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229);
    doc.text('উদাহরণ', 15, yPos);
    yPos += 8;
    
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text('উদাহরণ ১: গ্রাহক ২৫০ টাকার পেট্রোল কিনলেন', 15, yPos);
    yPos += 6;
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('• Normal Petrol (106.39/L)', 20, yPos);
    yPos += 5;
    doc.text('• Customer Price: 250', 20, yPos);
    yPos += 5;
    doc.text('• Discount = 250 / 106.39 = 2.35', 20, yPos);
    yPos += 5;
    doc.text('• Fuel to Give = 250 + 2.35 = 252.35 টাকার পেট্রোল দিন', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text('উদাহরণ ২: গ্রাহক ২ লিটার পেট্রোল কিনলেন', 15, yPos);
    yPos += 6;
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('• Liters: 2', 20, yPos);
    yPos += 5;
    doc.text('• Discount per Liter: 1', 20, yPos);
    yPos += 5;
    doc.text('• Customer Payment = 2 x 106.39 = 212.78', 20, yPos);
    yPos += 5;
    doc.text('• Total Discount = 2 x 1 = 2.00', 20, yPos);
    yPos += 5;
    doc.text('• Fuel to Give = 212.78 + 2.00 = 214.78 টাকার পেট্রোল দিন', 20, yPos);
    yPos += 15;
    
    // Footer
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(
            `Fuel Record Book - User Guide | পৃষ্ঠা ${i} of ${totalPages}`,
            105,
            285,
            { align: 'center' }
        );
    }
    
    // Save PDF
    doc.save('Fuel-Record-Book-Bengali-Guide.pdf');
    showMessage('বাংলা গাইড ডাউনলোড সম্পন্ন!', 'success');
}

// Export shift to PDF
function exportShiftToPDF(shiftId) {
    const shift = shiftHistory.find(s => s.id === shiftId);
    if (!shift) return;
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });
    
    // Set font
    doc.setFont('helvetica');
    
    // Title
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('FUEL RECORD - SHIFT REPORT', 148, 15, { align: 'center' });
    
    // Shift Info
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text(`Employee: ${shift.employeeName}`, 15, 30);
    doc.text(`Shift Start: ${formatDateTime(shift.shiftStart)}`, 15, 37);
    doc.text(`Shift End: ${formatDateTime(shift.shiftEnd)}`, 15, 44);
    
    const shiftDate = new Date(shift.shiftStart).toLocaleDateString('en-IN');
    doc.text(`Date: ${shiftDate}`, 220, 30);
    doc.text(`Total Transactions: ${shift.summary.totalTransactions}`, 220, 37);
    
    // Summary boxes
    const boxY = 55;
    const boxWidth = 65;
    const boxHeight = 30;
    const gap = 5;
    
    // Cash box
    doc.setFillColor(220, 252, 231);
    doc.rect(15, boxY, boxWidth, boxHeight, 'F');
    doc.setDrawColor(34, 197, 94);
    doc.rect(15, boxY, boxWidth, boxHeight, 'S');
    doc.setFontSize(10);
    doc.setTextColor(22, 101, 52);
    doc.text('CASH PAYMENT', 15 + boxWidth/2, boxY + 8, { align: 'center' });
    doc.setFontSize(16);
    doc.setTextColor(22, 163, 74);
    doc.text(`Rs ${shift.summary.cashTotal.toFixed(2)}`, 15 + boxWidth/2, boxY + 18, { align: 'center' });
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Discount: Rs ${shift.summary.cashDiscount.toFixed(2)}`, 15 + boxWidth/2, boxY + 25, { align: 'center' });
    
    // Card box
    doc.setFillColor(243, 232, 255);
    doc.rect(15 + boxWidth + gap, boxY, boxWidth, boxHeight, 'F');
    doc.setDrawColor(168, 85, 247);
    doc.rect(15 + boxWidth + gap, boxY, boxWidth, boxHeight, 'S');
    doc.setFontSize(10);
    doc.setTextColor(107, 33, 168);
    doc.text('CARD PAYMENT', 15 + boxWidth + gap + boxWidth/2, boxY + 8, { align: 'center' });
    doc.setFontSize(16);
    doc.setTextColor(147, 51, 234);
    doc.text(`Rs ${shift.summary.cardTotal.toFixed(2)}`, 15 + boxWidth + gap + boxWidth/2, boxY + 18, { align: 'center' });
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Discount: Rs ${shift.summary.cardDiscount.toFixed(2)}`, 15 + boxWidth + gap + boxWidth/2, boxY + 25, { align: 'center' });
    
    // Online box
    doc.setFillColor(219, 234, 254);
    doc.rect(15 + (boxWidth + gap) * 2, boxY, boxWidth, boxHeight, 'F');
    doc.setDrawColor(59, 130, 246);
    doc.rect(15 + (boxWidth + gap) * 2, boxY, boxWidth, boxHeight, 'S');
    doc.setFontSize(10);
    doc.setTextColor(30, 64, 175);
    doc.text('ONLINE PAYMENT', 15 + (boxWidth + gap) * 2 + boxWidth/2, boxY + 8, { align: 'center' });
    doc.setFontSize(16);
    doc.setTextColor(37, 99, 235);
    doc.text(`Rs ${shift.summary.onlineTotal.toFixed(2)}`, 15 + (boxWidth + gap) * 2 + boxWidth/2, boxY + 18, { align: 'center' });
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Discount: Rs ${shift.summary.onlineDiscount.toFixed(2)}`, 15 + (boxWidth + gap) * 2 + boxWidth/2, boxY + 25, { align: 'center' });
    
    // Total box
    doc.setFillColor(254, 243, 199);
    doc.rect(15 + (boxWidth + gap) * 3, boxY, boxWidth, boxHeight, 'F');
    doc.setDrawColor(245, 158, 11);
    doc.rect(15 + (boxWidth + gap) * 3, boxY, boxWidth, boxHeight, 'S');
    doc.setFontSize(10);
    doc.setTextColor(146, 64, 14);
    doc.text('TOTAL COLLECTION', 15 + (boxWidth + gap) * 3 + boxWidth/2, boxY + 8, { align: 'center' });
    doc.setFontSize(16);
    doc.setTextColor(217, 119, 6);
    doc.text(`Rs ${shift.summary.grandTotal.toFixed(2)}`, 15 + (boxWidth + gap) * 3 + boxWidth/2, boxY + 18, { align: 'center' });
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Discount: Rs ${shift.summary.totalDiscount.toFixed(2)}`, 15 + (boxWidth + gap) * 3 + boxWidth/2, boxY + 25, { align: 'center' });
    
    // Transaction table
    const tableData = shift.transactions.map(t => [
        formatDateTime(t.timestamp),
        t.paymentMethod.toUpperCase(),
        `Rs ${t.amount.toFixed(2)}`,
        `Rs ${t.discount.toFixed(2)}`
    ]);
    
    doc.autoTable({
        startY: 95,
        head: [['Time', 'Payment Method', 'Amount', 'Discount']],
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: [79, 70, 229],
            textColor: 255,
            fontSize: 10,
            fontStyle: 'bold'
        },
        bodyStyles: {
            fontSize: 9
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        },
        margin: { left: 15, right: 15 }
    });
    
    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(
            `Generated on ${new Date().toLocaleString('en-IN')} | Page ${i} of ${pageCount}`,
            148,
            200,
            { align: 'center' }
        );
    }
    
    // Save PDF
    const fileName = `shift-report-${shift.employeeName.replace(/\s+/g, '-')}-${shiftDate.replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
    
    showMessage('PDF exported successfully!', 'success');
}

// Save fuel prices
function saveFuelPrices() {
    const normalPrice = parseFloat(document.getElementById('normalPetrolPrice').value);
    const xp95Price = parseFloat(document.getElementById('xp95Price').value);
    const dieselPrice = parseFloat(document.getElementById('dieselPrice').value);
    
    if (!normalPrice || normalPrice <= 0) {
        showMessage('Please enter a valid price for Normal Petrol', 'error');
        return;
    }
    
    if (!xp95Price || xp95Price <= 0) {
        showMessage('Please enter a valid price for XP95', 'error');
        return;
    }
    
    if (!dieselPrice || dieselPrice <= 0) {
        showMessage('Please enter a valid price for Diesel', 'error');
        return;
    }
    
    fuelPrices.normal = normalPrice;
    fuelPrices.xp95 = xp95Price;
    fuelPrices.diesel = dieselPrice;
    
    saveData();
    displayCurrentPrices();
    updatePetrolPriceFromType();
    
    showMessage('Fuel prices saved successfully!', 'success');
}

// Load fuel prices into settings form
function loadFuelPrices() {
    document.getElementById('normalPetrolPrice').value = fuelPrices.normal.toFixed(2);
    document.getElementById('xp95Price').value = fuelPrices.xp95.toFixed(2);
    document.getElementById('dieselPrice').value = fuelPrices.diesel.toFixed(2);
}

// Display current saved prices
function displayCurrentPrices() {
    const displayDiv = document.getElementById('currentPricesDisplay');
    displayDiv.classList.remove('hidden');
    
    document.getElementById('displayNormalPrice').textContent = `₹${fuelPrices.normal.toFixed(2)}`;
    document.getElementById('displayXP95Price').textContent = `₹${fuelPrices.xp95.toFixed(2)}`;
    document.getElementById('displayDieselPrice').textContent = `₹${fuelPrices.diesel.toFixed(2)}`;
}

// Export all data as JSON
function exportAllData() {
    const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        appName: 'Fuel Record Book',
        data: {
            transactions: transactions,
            shiftInfo: shiftInfo,
            shiftHistory: shiftHistory,
            fuelPrices: fuelPrices
        }
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fuel-record-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showMessage('Data exported successfully!', 'success');
}

// Import data from JSON file
function importDataFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // Validate data structure
            if (!importedData.data) {
                showMessage('Invalid file format!', 'error');
                return;
            }
            
            // Confirm import
            if (!confirm('This will merge the imported data with your existing data. Continue?')) {
                return;
            }
            
            let newTransactionsCount = 0;
            let newShiftsCount = 0;
            
            // Merge transactions (avoid duplicates by ID)
            if (importedData.data.transactions && Array.isArray(importedData.data.transactions)) {
                const existingIds = new Set(transactions.map(t => t.id));
                const newTransactions = importedData.data.transactions.filter(t => !existingIds.has(t.id));
                transactions = [...transactions, ...newTransactions];
                newTransactionsCount = newTransactions.length;
            }
            
            // Merge shift history (avoid duplicates by ID)
            if (importedData.data.shiftHistory && Array.isArray(importedData.data.shiftHistory)) {
                const existingShiftIds = new Set(shiftHistory.map(s => s.id));
                const newShifts = importedData.data.shiftHistory.filter(s => !existingShiftIds.has(s.id));
                shiftHistory = [...shiftHistory, ...newShifts];
                newShiftsCount = newShifts.length;
            }
            
            // Update fuel prices if present
            if (importedData.data.fuelPrices) {
                if (confirm('Do you want to update fuel prices from the imported file?')) {
                    fuelPrices = importedData.data.fuelPrices;
                }
            }
            
            // Save merged data
            saveData();
            
            // Update UI
            updateDashboard();
            renderTransactions();
            renderHistory();
            updateFilterCounts();
            loadFuelPrices();
            updatePetrolPriceFromType();
            
            showMessage(`Data imported successfully! Added ${newTransactionsCount} transactions and ${newShiftsCount} shifts.`, 'success');
            
        } catch (error) {
            console.error('Import error:', error);
            showMessage(`Error importing data: ${error.message}. Please check the file format.`, 'error');
        }
    };
    
    reader.onerror = () => {
        showMessage('Error reading file. Please try again.', 'error');
    };
    
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
}
