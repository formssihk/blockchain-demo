/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
function Block({
  block,
  index,
  updateBlock,
  rehashBlock,
  blocks,
  showTick,
  confirmBlock,
  clientId,
  rejectBlock
}) {
  const storedClientId = localStorage.getItem('clientId');

  // Use the backend-provided `isValid` and `wasTampered` instead of recalculating
  const isCurrentBlockValid = block.isValid;
  const isTampered = block.wasTampered;

  // You can now rely on the `isValid`, `wasTampered`, and `isConfirmed` flags from the backend
  function getBlockClass(block) {
    let baseClass = 'w-1/2 lg:w-1/3 shrink-0 flex flex-col justify-between p-2 lg:p-4 border rounded shadow relative ';

    if (block.wasTampered) {
      baseClass += 'bg-red-200'; // Tampered block gets a red background
    } else if (!block.isValid) {
      baseClass += 'bg-red-100';  // Invalid block
    } else if (!block.isConfirmed && !block.isRejected) {
      baseClass += 'bg-green-100/10';  // Unconfirmed but not rejected block
    } else if (block.isRejected) {
      baseClass += 'bg-orange-100';  // Rejected block
    } else {
      baseClass += 'bg-green-100';  // Valid and confirmed block
    }

    return baseClass;
  }

  function showStatusIcon(block) {
    if (block.wasTampered || !block.isValid) {
      return (
        <div className="absolute top-2 right-2">
          <span className="text-red-500">✗</span>
        </div>
      );
    } else if (!block.isConfirmed && !block.isRejected) {
      return (
        <div className="absolute top-2 right-2">
          <span className="text-yellow-500">?</span>
        </div>
      );
    } else if (block.isRejected) {
      return (
        <div className="absolute top-2 right-2">
          <span className="text-orange-500">!</span>
        </div>
      );
    } else {
      return (
        <div className="absolute top-2 right-2">
          <span className="text-green-500">✓</span>
        </div>
      );
    }
  }

  const formatHash = (hash) => {
    if (!hash || hash.length <= 10) {
      return hash; // Return the hash as is if it's too short
    }
    return `${hash.slice(0, 5)}...${hash.slice(-5)}`;
  };

  return (
    <div className={getBlockClass(block)}>
      {showStatusIcon(block)}
      <p className="text-lg font-bold">Block {block.index + 1}</p>
      <div className="mt-2">
        <label className="font-semibold">Data: </label>
        <input
          type="text"
          value={block.data}
          onChange={(e) => updateBlock(e.target.value)}
          className="p-1 lg:p-2 border rounded w-full text-sm"
          disabled={storedClientId !== clientId}  // Only allow input if it's the user's node
        />
      </div>
      <div>
        <p className="text-xs lg:text-sm mt-2 break-all"><strong>Previous Hash:</strong> {formatHash(block.previousHash)}</p>
        <p className="text-xs lg:text-sm mt-2 break-all"><strong>Current Hash:</strong> {formatHash(block.hash)}</p>
        <p className="text-xs lg:text-sm mt-2 break-all"><strong>Block Proposed by:</strong> {formatHash(block.addedBy)}</p>
        <p className="text-xs lg:text-sm mt-2 break-all"><strong>Block Confirmed:</strong> {block.isConfirmed ? 'Yes' : 'No'}</p>
      </div>
      {block.isValid === false && <p className="text-red-500 mt-2">Block is invalid!</p>}
      {storedClientId === clientId && (
        <div className='w-full flex flex-wrap justify-center'>
          {/* <div className='w-full lg:w-1/2 flex justify-center'>
            <button
              onClick={rehashBlock}
              className="w-full m-1 lg:m-2 p-2 bg-orange-400 text-white text-xs lg:text-sm rounded"
            >
              Rehash Block
            </button>
          </div> */}
          {!block.isConfirmed && !block.isRejected && (
            <div className='w-full flex-wrap flex justify-center'>
              <button
                onClick={() => confirmBlock(block)}
                className=" mx-1 lg:mx-2 my-2 py-2 px-2 lg:px-4 bg-green-500 text-white text-xs lg:text-sm rounded"
              >
                Confirm Block
              </button>
              <button
                onClick={() => rejectBlock(block)}
                className=" mx-1 lg:mx-2 my-2 py-2 px-2 lg:px-4 bg-red-500 text-white text-xs lg:text-sm rounded"
              >
                Reject Block
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Block;
