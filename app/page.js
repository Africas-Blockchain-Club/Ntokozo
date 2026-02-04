"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import contractAbi from "../constants/EthRewardPool.json";

export default function Home() {
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState("0");
  const [loading, setLoading] = useState(false);

  // 1. Get the "Direct Line" URL from your .env.local file
  const alchemyUrl = process.env.NEXT_PUBLIC_ALCHEMY_URL;
  
  // 2. YOUR Sepolia Contract Address
  const contractAddress = "0xf9CE6dabAd68229b46F049aF7547A681c5900c6d";

  // --- CONNECT WALLET ---
  async function connectWallet() {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        setAccount(accounts[0]);
      } catch (err) {
        console.error("User denied account access");
      }
    } else {
      alert("Please install MetaMask!");
    }
  }

  // --- FETCH DATA USING ALCHEMY (Reliable) ---
  // This uses your private Alchemy URL to read data fast, bypassing MetaMask's traffic jams
  async function fetchPoolData() {
    try {
        if (!alchemyUrl) {
            console.error("Missing NEXT_PUBLIC_ALCHEMY_URL in .env.local");
            return;
        }
        const provider = new ethers.JsonRpcProvider(alchemyUrl);
        const poolBalance = await provider.getBalance(contractAddress);
        setBalance(ethers.formatEther(poolBalance));
    } catch (err) {
        console.error("Error fetching balance:", err);
    }
  }

  // --- FORCE METAMASK TO USE ALCHEMY ---
  // Click the "Fix Connection" button to run this
  async function fixConnection() {
    try {
      const chainId = "0xaa36a7"; // Sepolia Chain ID (Hex for 11155111)

      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainId,
            chainName: "Alchemy Sepolia (Fast)",
            rpcUrls: [alchemyUrl], // Forces your private URL
            nativeCurrency: {
              name: "Sepolia Ether",
              symbol: "ETH", // <--- CHANGED TO 'ETH' to fix the error
              decimals: 18,
            },
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          },
        ],
      });
      alert("Connection Fixed! MetaMask is now using Alchemy.");
      window.location.reload(); 
    } catch (error) {
      console.error("Failed to add network:", error);
      // If it still fails, user likely needs to delete the network manually first
      alert("MetaMask rejected the update. Please delete 'Sepolia' from your MetaMask settings and click this button again.");
    }
  }

  // --- JOIN POOL (Write Transaction) ---
  async function joinPool() {
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractAbi.abi, signer);

      // Sending 0.02 ETH
      const tx = await contract.joinPool({ value: ethers.parseEther("0.02") });
      console.log("Transaction sent:", tx.hash);
      
      await tx.wait();
      alert("Success! You are in the round.");
      fetchPoolData();
    } catch (err) {
      console.error(err);
      alert("Transaction failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  }

  // --- PICK WINNER (Admin Only) ---
  async function pickWinner() {
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractAbi.abi, signer);

      const tx = await contract.distributeReward();
      console.log("Picking winner...", tx.hash);
      
      await tx.wait();
      alert("Winner picked! Funds distributed.");
      fetchPoolData();
    } catch (err) {
      console.error(err);
      if (err.message.includes("Round not finished")) {
        alert("Wait! The 10-minute round timer isn't up yet.");
      } else if (err.message.includes("AccessControl")) {
        alert("Only the Admin (Deployer) can pick the winner!");
      } else {
        alert("Failed to pick winner. Check console.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPoolData();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-slate-900 text-white font-sans">
      <div className="max-w-md w-full bg-slate-800 p-8 rounded-3xl shadow-2xl text-center border border-slate-700">
        <h1 className="text-3xl font-extrabold mb-2 bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
          Eth Reward Pool
        </h1>
        <p className="text-slate-400 mb-8 text-sm">Decentralized Sweepstakes</p>
        
        <div className="mb-10 p-6 bg-slate-900/50 rounded-2xl border border-slate-700">
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Total Prize Pool</p>
            <p className="text-4xl font-mono font-bold text-green-400">{balance} ETH</p>
        </div>
        
        {!account ? (
          <button 
            onClick={connectWallet} 
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95"
          >
            Connect MetaMask
          </button>
        ) : (
          <div className="space-y-4">
            <div className="text-xs text-slate-500 bg-slate-900 p-2 rounded-lg truncate">
              Wallet: {account}
            </div>
            <button 
              onClick={joinPool} 
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {loading ? "Joining..." : "Join Round (0.02 ETH)"}
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-slate-700 w-full">
        <p className="text-xs text-slate-500 mb-2">ADMIN PANEL</p>
        <button 
            onClick={pickWinner}
            disabled={loading}
            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-3 rounded-xl transition-all border border-slate-600 active:scale-95 disabled:opacity-50"
        >
            {loading ? "Processing..." : "Pick Winner (Ends Round)"}
        </button>
        <p className="text-[10px] text-slate-500 mt-2">
            * Must wait 10 mins after round starts
        </p>
      </div>

      {/* DEBUG TOOL: Fix Connection Button */}
      <div className="mt-6 w-full text-center">
        <button 
            onClick={fixConnection}
            className="text-xs text-blue-400 underline hover:text-blue-300"
        >
            Fix MetaMask Connection (Use Alchemy)
        </button>
      </div>

    </main>
  );
}