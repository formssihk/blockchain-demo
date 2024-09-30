import { useState, useEffect, useRef } from 'react';
import Blockchain from './components/Blockchain';
import './App.css';
import axios from 'axios';
import sha256 from 'crypto-js/sha256';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [nodes, setNodes] = useState([]); 
  const [newBlockData, setNewBlockData] = useState('');
  const [ticks, setTicks] = useState([]);
  const [clientId, setClientId] = useState("");
  const socketRef = useRef(null); // Use useRef to avoid recreating WebSocket
  
  const BASE_URL = import.meta.env.VITE_API_URL;
  const WS_URL = import.meta.env.VITE_WS_URL;

  // Fetch blockchain data
  const fetchBlockchain = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/blocks`);
      setNodes(response.data); 
      setTicks(new Array(response.data.length).fill(false)); 
    } catch (error) {
      console.error('Error fetching blockchain data:', error);
    }
  };

  useEffect(() => {
    const storedClientId = localStorage.getItem('clientId');

    fetchBlockchain();

    if (!socketRef.current) {
      socketRef.current = new WebSocket(`${WS_URL}`);

      socketRef.current.onopen = () => {
        if (storedClientId) {
          // Send the existing clientId to the backend
          console.log('Sending existing clientId to the server:', storedClientId);
          socketRef.current.send(JSON.stringify({ clientId: storedClientId }));
        } else {
          // No clientId found, let the backend generate a new one
          socketRef.current.send(JSON.stringify({ clientId: null }));
        }
      };

      socketRef.current.onmessage = (message) => {
        const data = JSON.parse(message.data);
        const storedClientId = localStorage.getItem('clientId');
      
        if (data.type === 'clientId') {
          // Store the clientId if not already in localStorage
          if (!storedClientId) {
            localStorage.setItem('clientId', data.clientId);
            setClientId(data.clientId);
            console.log('New clientId received and saved:', data.clientId);
          }
        } else if (data.type === 'update') {
          // Validate only the user's node based on clientId
          const userNode = data.blockchain.find(node => node.clientId === storedClientId);
          
          if (userNode && validateUserNode(userNode)) {
            setNodes(data.blockchain); // Set the new blockchain state only if the user's node is valid
            setTicks(new Array(data.blockchain.length).fill(false)); // Reset ticks when blockchain updates
          } else {
            toast.error("Received tampered data for your node, rejecting update.");
          }
        }
      };
      

      socketRef.current.onclose = () => {
        console.log('WebSocket connection closed');
      };

      socketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    }

    // Cleanup WebSocket connection when component unmounts
    return () => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        console.log('Closing WebSocket connection');
        socketRef.current.close();
      }
    };
  }, []); 
  
  const validateUserNode = (userNode) => {
    const blocks = userNode.blocks;
    
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
  
      // Recalculate the hash of the current block
      const recalculatedHash = sha256(block.index + block.data + block.previousHash).toString();
  
      // If the recalculated hash doesn't match the block's current hash, the block is tampered with
      if (block.hash !== recalculatedHash) {
        console.error(`Block tampering detected in user's node: ${userNode.clientId}, block index: ${block.index}`);
        return false; // Return false if tampering is detected
      }
    }
  
    return true; // Return true if no tampering is detected
  };
  

  const addBlock = async () => {
    const storedClientId = localStorage.getItem('clientId');
    if (newBlockData.trim() === '') {
      toast.error("Please enter data for the new block.");
      return;
    }
  
    console.log(`Adding new block: ${newBlockData}, clientId: ${storedClientId}`);
    try {
      await axios.post(`${BASE_URL}/blocks`, { newBlockData, clientId: storedClientId });
      setNewBlockData(''); 
      toast.success('Block added successfully!');
    } catch (error) {
      // Check if there's a response from the server and if the error object contains the message
      const errorMessage = error.response?.data?.error || 'Error adding new block';
      toast.error(`Error: ${errorMessage}`); // Display error message in toast
      console.error('Error adding new block:', error);
    }
  };
  

  const confirmBlock = async (nodeIndex, block) => {
    const storedClientId = localStorage.getItem('clientId');
    
    if (!storedClientId) {
      console.error('Client ID is not available');
      return;
    }
  
    const blockData = nodes[nodeIndex].blocks[block]; // Retrieve the block to confirm
    const calculatedHash = sha256(blockData.index + blockData.data + blockData.previousHash).toString();
  
    // Check if the block data has been tampered with
    if (calculatedHash !== blockData.hash) {
      toast.error("Block data has been tampered with! Cannot confirm.");
      return;
    }
  
    console.log("Confirming block:", nodeIndex, block);
  
    try {
      await axios.post(`${BASE_URL}/confirm`, { clientId: storedClientId, data: { index: block } });
  
      // Update the tick state to show the block has been confirmed
      setTicks((prevTicks) => {
        const newTicks = [...prevTicks];
        newTicks[nodeIndex] = true;
        return newTicks;
      });
  
      toast.success("Block confirmed!");
    } catch (error) {
      console.error('Error confirming block:', error);
      alert('Failed to confirm block');
    }
  };
  
  

  const updateBlock = async (nodeIndex, blockIndex, data) => {
    const updatedNodes = [...nodes]; // Make a copy of the nodes state
    const block = updatedNodes[nodeIndex].blocks[blockIndex]; // Get the block to update
    const blockCurrHash = sha256(block.index + data + block.previousHash).toString(); // Recalculate the hash
  
    // Check if the block has been tampered
    const isTampered = blockCurrHash !== block.hash;
  
    // Update the block's data and tampering status
    const updatedBlock = { 
      ...block, 
      data, 
      hash: blockCurrHash, 
      isValid: !isTampered, 
      wasTampered: isTampered // Mark the block as tampered if necessary
    };
  
    // Update the block in the nodes array
    updatedNodes[nodeIndex].blocks[blockIndex] = updatedBlock;
  
    // If the block is tampered, invalidate all subsequent blocks
    if (isTampered) {
      for (let i = blockIndex + 1; i < updatedNodes[nodeIndex].blocks.length; i++) {
        updatedNodes[nodeIndex].blocks[i] = {
          ...updatedNodes[nodeIndex].blocks[i],
          isValid: false, // Mark subsequent blocks as invalid
          wasTampered: true // Mark as tampered
        };
      }
  
      // Notify the backend about the tampered block
      try {
        await axios.post(`${BASE_URL}/blocks/tampered`, {
          clientId: nodes[nodeIndex].clientId,
          blockIndex: blockIndex
        });
        toast.error("Block tampered! Other nodes are notified.");
      } catch (error) {
        console.error('Error notifying backend of tampering:', error);
        toast.error("Error notifying backend of tampering.");
      }
    } else {
      toast.success("Block updated successfully.");
    }
  
    // Set the updated nodes back to state
    setNodes(updatedNodes);
  };
  
  
  const rehashBlock = (nodeIndex, blockIndex) => {
    // Make a shallow copy of the nodes state
    const updatedNodes = [...nodes];
  
    // Access the specific block in the corresponding node
    const block = updatedNodes[nodeIndex].blocks[blockIndex];
  
    // Recalculate the hash using the block's index, data, and previous hash
    const blockCurrHash = sha256(block.index + block.data + block.previousHash).toString();
  
    // Update the block's hash, set isValid to true, and wasTampered to false
    const updatedBlock = {
      ...block,
      hash: blockCurrHash,
      isValid: true, 
      wasTampered: false, 
      isConfirmed: false, 
    };
  
    // Replace the updated block in the corresponding node
    updatedNodes[nodeIndex].blocks[blockIndex] = updatedBlock;
  
    // Update the nodes state to trigger re-render
    setNodes(updatedNodes);
  
    // Optionally, you can show a success message
    toast.success("Block rehashed successfully.");
  };
  

  const deleteBlockchain = async () => {
    const storedClientId = localStorage.getItem('clientId'); // Get the clientId from localStorage
  
    if (!storedClientId) {
      alert('No client ID found in local storage');
      return;
    }
  
    try {
      // Send a DELETE request to the server with the clientId
      await axios.delete(`${BASE_URL}/blocks`, {
        data: { clientId: storedClientId }, // Send clientId in the request body
      });

  
      // Update the state to clear nodes in the frontend
      setNodes([]);
  
      fetchBlockchain()
    } catch (error) {
      console.error('Error deleting blockchain:', error);
      alert('Failed to delete blockchain data');
    }
  };
  

  return (
    <div className="">
      <h1 className="text-2xl font-bold text-center my-4">Blockchain Demo</h1>
      <div className='m-2 lg:m-4 flex flex-wrap'>
        <div className='flex items-center w-full lg:w-1/3 mx-2 my-2'>
          <input
            type="text"
            value={newBlockData}
            onChange={(e) => setNewBlockData(e.target.value)}
            placeholder="Enter new block data"
            className="w-2/3 p-2 border rounded mr-2 lg:mr-4 text-sm"
          />
          <div className='w-1/3 flex items-center'>
            <button
              onClick={addBlock}
              className="text-center p-2 bg-blue-500 text-white rounded text-sm lg:text-base"
            >
              Add Block
            </button>
          </div>
        </div>
        <div className='flex items-center w-full lg:w-1/3 mx-2 my-2'>
          <button
            onClick={deleteBlockchain}
            className="text-center p-2 bg-red-500 text-white rounded text-sm lg:text-base"
          >
            Restart Blockchain
          </button>
        </div>

      </div>
      <div>
        {nodes.map((node, nodeIndex) => (
          <Blockchain
            key={nodeIndex}
            clientId={node.clientId} // Pass the clientId to the Blockchain component
            blocks={node.blocks} // Pass the array of blocks for this node
            updateBlock={(blockIndex, data) => updateBlock(nodeIndex, blockIndex, data)}
            rehashBlock={(blockIndex) => rehashBlock(nodeIndex, blockIndex)}
            confirmBlock={(blockIndex) => confirmBlock(nodeIndex, blockIndex)}
            nodeIndex={nodeIndex}
            showTick={ticks[nodeIndex]} // Pass the tick state for the current node
          />
        ))}
      </div>
      <ToastContainer
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover={false}
        theme="light"
        />
    </div>
  );
}

export default App;
