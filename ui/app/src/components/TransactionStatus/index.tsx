import { defineComponent, PropType } from "vue";
import { TransactionStatus, TxParams } from "@sifchain/sdk";

const getTransactionExplorerUrl = (hash: string) => {
    if (hash.startsWith('0x')) {
        return `https://etherscan.io/tx/${hash}`
    } else {
        
    }
}

export default defineComponent({
    name: 'TransactionStatus',
    props: {
        status: {
            type: object as PropType<TransactionStatus>,
            required: true
        }
    }
  hash: string;
}) {
    const items = [{

    }]
}
