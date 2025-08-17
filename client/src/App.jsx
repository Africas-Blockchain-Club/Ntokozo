import React, { useEffect, useState } from "react";
import { getWeb3, getLotteryContract } from "./utils/u";
import "./App.css";

function App() {
  const [web3, setWeb3] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState("");
  const [players, setPlayers] = useState([]);
  const [balance, setBalance] = useState("0");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        const web3Instance = getWeb3();
        if (!web3Instance) return;
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        setAccount(accounts[0]);
        setWeb3(web3Instance);
        setContract(getLotteryContract(web3Instance));
      } catch (err) {
        if (err.code === -32002) {
          setMessage("MetaMask permission request already pending. Please check MetaMask and approve or reject the request, then refresh the page.");
        } else {
          setMessage("Error connecting to MetaMask: " + (err.message || err));
        }
      }
    };
    init();
  }, []);

  const enterLottery = async () => {
    if (!contract) {
      setMessage("Contract not initialized. Please connect MetaMask and refresh the page.");
      return;
    }
    setMessage("Entering lottery...");
    try {
      await contract.methods.enter().send({ from: account, value: web3.utils.toWei("0.01", "ether") });
      setMessage("You have entered the lottery!");
    } catch (err) {
      setMessage("Error entering lottery: " + (err.message || err));
    }
  };

  const getPlayers = async () => {
    if (!contract) {
      setMessage("Contract not initialized. Please connect MetaMask and refresh the page.");
      return;
    }
    try {
      const playersList = await contract.methods.getPlayers().call();
      setPlayers(playersList);
    } catch (err) {
      setMessage("Error fetching players: " + (err.message || err));
    }
  };

  const getBalance = async () => {
    if (!contract) {
      setMessage("Contract not initialized. Please connect MetaMask and refresh the page.");
      return;
    }
    try {
      const bal = await contract.methods.getBalance().call();
      setBalance(web3.utils.fromWei(bal, "ether"));
    } catch (err) {
      setMessage("Error fetching balance: " + (err.message || err));
    }
  };

  const pickWinner = async () => {
    if (!contract) {
      setMessage("Contract not initialized. Please connect MetaMask and refresh the page.");
      return;
    }
    setMessage("Picking winner...");
    try {
      await contract.methods.pickWinner().send({ from: account });
      setMessage("Winner has been picked!");
    } catch (err) {
      setMessage("Error picking winner: " + (err.message || err));
    }
  };

  return (
    <div className="App">
      <h1>Lottery</h1>
      <button onClick={enterLottery}>Enter Lottery (0.01 ETH)</button>
      <button onClick={getPlayers}>Show Players</button>
      <button onClick={getBalance}>Show Balance</button>
      <button onClick={pickWinner}>Pick Winner</button>
      <div>
        <h2>Players:</h2>
        <ul>
          {players.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
      </div>
      <div>
        <h2>Balance: {balance} ETH</h2>
      </div>
      <p>{message}</p>
    </div>
  );
}

export default App;
