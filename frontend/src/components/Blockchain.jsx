/* eslint-disable react/prop-types */
import Block from './Block';

function Blockchain({ clientId, blocks, updateBlock, rehashBlock, nodeIndex, showTick, confirmBlock }) {
  const storedClientId = localStorage.getItem('clientId');
  return (
    <div className='flex flex-col overflow-x-scroll'>
      <div>
        <h2 className="text-lg font-bold mx-2 lg:mx-4 mb-1 lg:my-2">{storedClientId === clientId ? "My Node": `Node ${nodeIndex+1}`}</h2>
      </div>
      <div 
        className="p-2 lg:p-4 border rounded flex overflow-x-scroll space-x-4 flex-none"
        style={{width: '98vw'}}
      >
        {blocks && blocks.map((block, index) => (
          <Block
            key={index}
            block={block}
            index={index}
            updateBlock={(data) => updateBlock(index, data)}
            rehashBlock={() => rehashBlock(index)}
            confirmBlock={(data) => confirmBlock(index, data)}
            blocks={blocks}
            showTick={index === blocks.length - 1 && showTick} // Show tick only for the latest block
            clientId={clientId}
          />
        ))}
      </div>
    </div>
  );
}

export default Blockchain;
