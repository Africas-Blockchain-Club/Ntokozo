import Web3 from "web3";
import lottoABI from "../contract/lotto.json";
const CONTRACT_ADDRESS = lottoABI.address;

export const getWeb3 = () => {
  if (window.ethereum) {
    return new Web3(window.ethereum);
  }
  alert("Please install MetaMask!");
  return null;
};

export const getLotteryContract = (web3) => {
  return new web3.eth.Contract(lottoABI.abi, CONTRACT_ADDRESS);
};
