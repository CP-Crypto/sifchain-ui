import { defineComponent } from "vue";
import AssetIconVue from "@/componentsLegacy/utilities/AssetIcon.vue";
import { computed, reactive } from "@vue/reactivity";
import { IAsset } from "../../../../core/src";

export const TokenInputGroup = (props: {
  heading: string;
  formattedBalance?: string;
  asset: IAsset;
  amount: string;
  onSetToMaxAmount: () => any;
  onInputAmount: (amount: string) => any;
}) => {
  console.log(props.asset);
  console.log("hello");
  return (
    <div class="p-[20px] bg-darkfill-base rounded-[10px] mt-[10px]">
      <div class="w-full flex justify-between">
        <div class=" text-[16px] text-white font-sans font-medium capitalize">
          {props.heading}
        </div>
        <div
          class={`text-white opacity-50 font-sans font-medium text-[12px] ${
            props.formattedBalance ? "" : "opacity-0"
          }`}
        >
          Balance {props.formattedBalance}{" "}
          {props.asset.label.replace(/^c/gim, "")}
        </div>
      </div>
      <div class="relative flex flex-row mt-[10px]">
        <button class="relative flex items-center w-[186px] h-[54px] p-[8px] pr-0 rounded-[4px] bg-darkfill-input border-solid border-darkfill-input_outline border-[1px]">
          <select class="absolute top-0 bottom-0 left-0 right-0 w-full h-full opacity-0 cursor-pointer">
            {["ROWAN", "ETH", "DAI", "ATOM"].map((curr) => {
              return (
                <option key={curr} value={curr}>
                  {curr}
                </option>
              );
            })}
          </select>
          <img
            class="h-[38px]"
            src={props.asset.imageUrl?.replace("thumb", "large")}
          />
          <div class="font-sans ml-[8px] text-[18px] font-medium text-white uppercase">
            {props.asset.label.replace(/^c/gim, "")}
          </div>
          <AssetIconVue
            class="w-[24px] h-[24px] mr-[20px] ml-auto"
            icon="interactive/chevron-down"
          />
        </button>
        <div class="relative ml-[10px] flex items-center w-[254px] h-[54px] p-[8px] pl-0 rounded-[4px] bg-darkfill-input border-solid border-darkfill-input_outline border-[1px]">
          <input
            type="number"
            min="0"
            style={{
              textAlign: "right",
            }}
            onInput={(e) => {
              props.onInputAmount((e.target as HTMLInputElement).value || "");
            }}
            value={props.amount}
            class="box-border w-full absolute top-0 bottom-0 left-0 right-0 pr-[16px] pl-[68px] h-full bg-transparent outline-none text-[20px] text-white font-sans font-medium"
          />
          <button
            onClick={() => props.onSetToMaxAmount()}
            class="z-10 ml-[16px] box-content text-[10px] p-[1px] font-semibold bg-gradient-to-b from-accent-base to-accent-accent_gradient_to rounded-full font-sans"
          >
            <div class="flex items-center px-[9px] h-[18px] bg-darkfill-input rounded-full text-accent-base">
              <span style="letter-spacing: -1%; line-height: 10px;">MAX</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};