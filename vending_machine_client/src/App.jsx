import { useState } from 'react';
import { ethers } from "ethers";
import $u from './utils/$u.js';
import VendingMachineContract from './contract/VendingMachine.json';

function App() {
  const [account, setAccount] = useState(null);
  const [vendingBalance, setVendingBalance] = useState("0");
  const [contract, setContract] = useState(null);



  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install Metamask to use this app.");
      return;
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      const signer = provider.getSigner();
      const address = await signer.getAddress();

      const network = await provider.getNetwork();
      if (network.chainId !== 534351) { 
        alert("Please switch to Scroll Sepolia");
        return;
      }

      const ethBalance = await provider.getBalance(address);
      const formattedBalance = $u.moveDecimalLeft(ethBalance.toString(), 18); 

      setAccount({
        address,
        balance: formattedBalance,
        chainId: network.chainId
      });

      const vending = new ethers.Contract(
        "0xf2B1114C644cBb3fF63Bf1dD284c8Cd716e95BE9",
        VendingMachineContract,
        signer
      );

      setContract(vending);

      const machineBalance = await vending.getVendingMachineBalance();
      setVendingBalance(machineBalance.toString());
    } catch (err) {
      console.error("Connection failed:", err);
    }
  };

  const restockVendingMachine = async () => {
    if (!contract || !account) return;

    try {
      const tx = await contract.restock(50);
      await tx.wait();

      const updated = await contract.getVendingMachineBalance();
      setVendingBalance(updated.toString());
    } catch (err) {
      console.error("Restock failed:", err);
    }
  };
  const purchaseDonuts = async () => {
    if (!contract || !account) return;

    try {
      const tx = await contract.purchase(1, {
        value: ethers.utils.parseEther("2"),
      });
      await tx.wait();

      const updated = await contract.getVendingMachineBalance();
      setVendingBalance(updated.toString());
    } catch (err) {
      console.error("Purchase failed:", err);
    }
  };

  return (
    <div>
      <h1>Vending Machine App</h1>
      {account ? (
        <div>
          <p>Connected: {account.address}</p>
          <p>Balance: {account.balance} ETH</p>
          <p>Vending Machine Balance: {vendingBalance}</p>
          <button onClick={restockVendingMachine}>Restock Vending Machine</button>
          <button onClick={purchaseDonuts}>Purchase Donuts</button>
        </div>
      ) : (
        <button onClick={connectWallet}>Connect Wallet</button>
      )}
    </div>
  );
}

export default App;