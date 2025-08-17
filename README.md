# 📖 Lottery DApp

A decentralized lottery application built with **React, Web3.js, and Solidity**.
Users can connect their **MetaMask wallet**, enter the lottery with **0.01 ETH**, view players, check the prize pool balance, and the contract owner can pick a winner.



## 🚀 Features

* 🎟️ **Enter Lottery** → Join by sending 0.01 ETH.
* 👥 **View Players** → See all addresses currently entered.
* 💰 **Check Balance** → View the total prize pool in ETH.
* 🏆 **Pick Winner** → Contract owner can randomly pick a winner.
* 📜 **Lottery History** → Track winners from previous rounds.



## 🛠️ Tech Stack

* **Frontend:** React, JavaScript, CSS
* **Blockchain:** Solidity Smart Contract (Ethereum)
* **Web3 Integration:** Web3.js, MetaMask



## 📂 Project Structure

```
lottery-dapp/
│── public/
│   └── index.html      # Root HTML template
│── src/
│   ├── App.js          # Main React component
│   ├── index.js        # React entry point
│   ├── index.css       # Global styles
│   ├── utils/u.js      # Web3 + Contract helpers
│── package.json
│── README.md           # Project documentation

## ⚡ Installation & Setup

### 1️⃣ Prerequisites

* Node.js & npm installed
* MetaMask wallet installed in browser
* Access to an Ethereum testnet (Goerli, Sepolia, or Ganache local blockchain)

### 2️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/lottery-dapp.git
cd lottery-dapp
```

### 3️⃣ Install Dependencies

```bash
npm install
```

### 4️⃣ Configure Contract

* Update the **contract address** in `utils/u.js` with your deployed contract address.
* Ensure the **ABI** matches your smart contract.

### 5️⃣ Run the Application

```bash
npm start
```

App will run at **[http://localhost:3000](http://localhost:3000)**

---

## 🎮 Usage

1. Open the app in your browser.
2. Connect MetaMask wallet.
3. Click **Enter Lottery** → sends 0.01 ETH to the contract.
4. Use **Show Players** to see who joined.
5. Use **Show Balance** to see the prize pool.
6. Contract owner → **Pick Winner** to distribute the funds.

---

## 📜 Smart Contract (Functions)

* `enter()` → Payable function to join lottery.
* `pickWinner()` → Owner picks a random winner.
* `getPlayers()` → Returns list of players.
* `getBalance()` → Returns lottery balance.
* `getWinnerByLottery(id)` → Returns past winners.
* `lotteryId` → Current lottery round number.



## 🔐 Security Notes

* Only the **owner** can pick a winner.
* Uses a simple pseudo-random number generator (not secure for production).
* Best for **educational/demo purposes**.



## 📸 Screenshots (optional)

*Add screenshots of your app UI here.*



## 👩‍💻 Authors

Ntokozo Maseko



## 📜 License

This project is licensed under the MIT License.

