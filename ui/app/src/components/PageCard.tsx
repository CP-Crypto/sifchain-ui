import AssetIcon, { IconName } from "@/componentsLegacy/utilities/AssetIcon";
import {
  VNode,
  Component,
  defineComponent,
  HTMLAttributes,
  PropType,
  SetupContext,
} from "vue";

export default defineComponent({
  props: {
    heading: {
      type: String,
      required: true,
    },
    headerContent: {
      type: Object as any,
    },
    headerAction: Object as PropType<Component>,
    iconName: String as PropType<IconName>,
    class: String as PropType<HTMLAttributes["class"]>,
  },
  setup: function PageCard(props, context: SetupContext) {
    // debugger;
    return () => (
      <div class="block pt-[90px] md:pt-[90px] lg:pt-[90px] xl:pt-[90px] 2xl:pt-[130px] pb-[530px] ">
        <div
          key="view-layer"
          class={[
            `transition-all justify-start flex-col items-center bg-black relative w-[50vw] max-w-[800px] min-w-[531px] rounded-[10px] text-white px-4`,
            props.class,
          ]}
        >
          <div class="sticky top-0 w-full bg-black z-10 pt-4">
            {!!props.heading && (
              <div class="w-full flex-row flex justify-between items-center pb-[10px]">
                <div class="flex items-center">
                  {!!props.iconName && (
                    <AssetIcon icon={props.iconName} size={32} active />
                  )}
                  <span class="text-accent-base font-sans text-[26px] ml-[10px] font-semibold">
                    {props.heading}
                  </span>
                </div>
                <div class="flex items-center">{props.headerAction}</div>
              </div>
            )}
            {props.headerContent}
          </div>
          <div class="w-full">{context.slots.default?.()}</div>
        </div>
      </div>
    );
  },
});
