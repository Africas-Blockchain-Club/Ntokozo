// Configuration - UPDATE THESE VALUES AFTER DEPLOYMENT
const CONFIG = {
    CONTRACT_ADDRESS: "YOUR_DEPLOYED_CONTRACT_ADDRESS_HERE", // Update this!
    NETWORK: {
        chainId: '0xaa36a7', // Sepolia
        chainName: 'Sepolia Testnet',
        rpcUrls: ['https://sepolia.infura.io/v3/'],
        blockExplorerUrls: ['https://sepolia.etherscan.io']
    }
};

// Contract ABI (automatically loaded from contract-abi.js)
let CONTRACT_ABI;

// Global variables
let provider;
let signer;
let contract;
let userAddress;
let selectedNumbers = [];

// DOM Elements
const connectWalletBtn = document.getElementById('connectWallet');
const accountInfo = document.getElementById('accountInfo');
const accountAddress = document.getElementById('accountAddress');
const accountBalance = document.getElementById('accountBalance');
const numberGrid = document.getElementById('numberGrid');
const quickPickBtn = document.getElementById('quickPick');
const clearSelectionBtn = document.getElementById('clearSelection');
const buyTicketBtn = document.getElementById('buyTicket');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const toast = document.getElementById('toast');
const contractAddressSpan = document.getElementById('contractAddress');

// Initialize the app
async function init() {
    // Display contract address
    contractAddressSpan.textContent = CONFIG.CONTRACT_ADDRESS;
    
    // Generate number grid
    generateNumberGrid();
    
    // Load contract ABI
    CONTRACT_ABI = window.CONTRACT_ABI || [];
    
    // Event listeners
    connectWalletBtn.addEventListener('click', connectWallet);
    quickPickBtn.addEventListener('click', quickPick);
    clearSelectionBtn.addEventListener('click', clearSelection);
    buyTicketBtn.addEventListener('click', buyTicket);
    
    // Check if wallet is already connected
    if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
            await connectWallet();
        }
    }
}

// Generate number grid (1-49)
function generateNumberGrid() {
    for (let i = 1; i <= 49; i++) {
        const btn = document.createElement('button');
        btn.className = 'number-btn';
        btn.textContent = i;
        btn.dataset.number = i;
        btn.addEventListener('click', () => selectNumber(i, btn));
        numberGrid.appendChild(btn);
    }
}

// Connect wallet
async function connectWallet() {
    try {
        if (!window.ethereum) {
            showToast('Please install MetaMask!', 'error');
            return;
        }

        showLoading('Connecting wallet...');

        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        userAddress = accounts[0];

        // Check network
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainId !== CONFIG.NETWORK.chainId) {
            await switchNetwork();
        }

        // Setup ethers
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        contract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        // Update UI
        connectWalletBtn.style.display = 'none';
        accountInfo.style.display = 'flex';
        accountAddress.textContent = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
        
        // Get balance
        await updateBalance();
        
        // Load lottery info
        await loadLotteryInfo();

        showToast('Wallet connected!', 'success');
        hideLoading();

        // Listen for account changes
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', () => window.location.reload());

    } catch (error) {
        console.error('Error connecting wallet:', error);
        showToast('Failed to connect wallet', 'error');
        hideLoading();
    }
}

// Switch to Sepolia network
async function switchNetwork() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: CONFIG.NETWORK.chainId }],
        });
    } catch (error) {
        if (error.code === 4902) {
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [CONFIG.NETWORK],
            });
        }
    }
}

// Update balance
async function updateBalance() {
    const balance = await provider.getBalance(userAddress);
    const ethBalance = ethers.utils.formatEther(balance);
    accountBalance.textContent = `${parseFloat(ethBalance).toFixed(4)} ETH`;
}

// Load lottery information
async function loadLotteryInfo() {
    try {
        // Get prize pool
        const balance = await provider.getBalance(CONFIG.CONTRACT_ADDRESS);
        document.getElementById('prizePool').textContent = `${ethers.utils.formatEther(balance)} ETH`;

        // Get ticket count (count tickets array length - you may need to add a getter function)
        // For now, we'll show "N/A" as the contract doesn't expose tickets.length
        document.getElementById('ticketCount').textContent = 'N/A';

        // Get last draw timestamp
        const lastDrawTimestamp = await contract.lastDrawTimestamp();
        const interval = await contract.interval();
        const nextDrawTime = lastDrawTimestamp.add(interval).toNumber() * 1000;
        const now = Date.now();
        
        if (nextDrawTime > now) {
            const timeLeft = nextDrawTime - now;
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            document.getElementById('nextDraw').textContent = `${hours}h ${minutes}m`;
        } else {
            document.getElementById('nextDraw').textContent = 'Ready to draw!';
        }

        // Get last winning numbers
        const winningNumbersDiv = document.getElementById('winningNumbers');
        winningNumbersDiv.innerHTML = '';
        for (let i = 0; i < 7; i++) {
            const num = await contract.lastWinningNumbers(i);
            const div = document.createElement('div');
            div.className = 'winning-number';
            div.textContent = num > 0 ? num : '?';
            winningNumbersDiv.appendChild(div);
        }

    } catch (error) {
        console.error('Error loading lottery info:', error);
    }
}

// Handle account changes
function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        location.reload();
    } else {
        userAddress = accounts[0];
        accountAddress.textContent = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
        updateBalance();
    }
}

// Select a number
function selectNumber(number, btn) {
    if (selectedNumbers.includes(number)) {
        // Deselect
        selectedNumbers = selectedNumbers.filter(n => n !== number);
        btn.classList.remove('selected');
    } else if (selectedNumbers.length < 7) {
        // Select
        selectedNumbers.push(number);
        btn.classList.add('selected');
    } else {
        showToast('You can only select 7 numbers!', 'error');
        return;
    }

    updateSelectedSlots();
    updateBuyButton();
}

// Update selected number slots
function updateSelectedSlots() {
    const slots = document.querySelectorAll('.number-slot');
    slots.forEach((slot, index) => {
        if (selectedNumbers[index] !== undefined) {
            slot.textContent = selectedNumbers[index];
            slot.classList.add('filled');
        } else {
            slot.textContent = '?';
            slot.classList.remove('filled');
        }
    });
}

// Update buy button state
function updateBuyButton() {
    buyTicketBtn.disabled = selectedNumbers.length !== 7;
}

// Quick pick random numbers
function quickPick() {
    clearSelection();
    
    const available = Array.from({length: 49}, (_, i) => i + 1);
    for (let i = 0; i < 7; i++) {
        const randomIndex = Math.floor(Math.random() * available.length);
        const number = available[randomIndex];
        available.splice(randomIndex, 1);
        
        selectedNumbers.push(number);
        const btn = document.querySelector(`[data-number="${number}"]`);
        btn.classList.add('selected');
    }
    
    updateSelectedSlots();
    updateBuyButton();
    showToast('Random numbers selected!', 'info');
}

// Clear selection
function clearSelection() {
    selectedNumbers = [];
    document.querySelectorAll('.number-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    updateSelectedSlots();
    updateBuyButton();
}

// Buy ticket
async function buyTicket() {
    if (!contract) {
        showToast('Please connect your wallet first!', 'error');
        return;
    }

    if (selectedNumbers.length !== 7) {
        showToast('Please select exactly 7 numbers!', 'error');
        return;
    }

    try {
        showLoading('Buying ticket...');

        const ticketPrice = ethers.utils.parseEther('0.0000001');
        const tx = await contract.buyTicket(selectedNumbers, {
            value: ticketPrice
        });

        showLoading('Waiting for confirmation...');
        await tx.wait();

        showToast('Ticket purchased successfully! 🎉', 'success');
        
        // Clear selection and reload info
        clearSelection();
        await updateBalance();
        await loadLotteryInfo();

    } catch (error) {
        console.error('Error buying ticket:', error);
        
        if (error.code === 4001) {
            showToast('Transaction cancelled', 'error');
        } else if (error.message.includes('Incorrect ETH amount')) {
            showToast('Incorrect ETH amount', 'error');
        } else if (error.message.includes('Numbers must be 1-49')) {
            showToast('Numbers must be between 1-49', 'error');
        } else {
            showToast('Failed to buy ticket. Check console for details.', 'error');
        }
    } finally {
        hideLoading();
    }
}

// Show loading overlay
function showLoading(message) {
    loadingText.textContent = message;
    loadingOverlay.style.display = 'flex';
}

// Hide loading overlay
function hideLoading() {
    loadingOverlay.style.display = 'none';
}

// Show toast notification
function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Auto-refresh lottery info every 30 seconds
setInterval(() => {
    if (contract) {
        loadLotteryInfo();
    }
}, 30000);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
