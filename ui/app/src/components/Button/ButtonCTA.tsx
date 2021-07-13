import { ButtonHTMLAttributes, mergeProps, SetupContext } from "vue";

export const ButtonCTA = (props: ButtonHTMLAttributes, ctx: SetupContext) => {
  return (
    <button
      {...props}
      class={[
        `w-full h-[62px] rounded-[4px] bg-accent-gradient flex items-center justify-center font-sans text-[18px] font-semibold text-white`,
        props.class,
      ]}
      style={
        mergeProps(
          {
            style: {
              textShadow: "0px 1px 1px rgba(0, 0, 0, 0.3)",
            },
          },
          { style: props.style },
        ).style as ButtonHTMLAttributes["style"]
      }
    >
      {ctx.slots.default?.()}
    </button>
  );
};