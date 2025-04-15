type FormButtonNavBackProps = React.ComponentProps<"button"> & {
  icon: React.ElementType;
  text: string
};

export default function ActionButton({
  icon: Icon,
  text,
  ...props
}: FormButtonNavBackProps) {
  return (
    <button
      className=" text-primary-300 bg-emerald-800  active:bg-primary-500 text-md focus-within:border-emerald-900
         hover:border-primary-600 hover:bg-primary-300/90 hover:text-primary-50 focus:bg-primary-300/90 shadow-primary-300/40
          flex cursor-pointer justify-between  rounded-2xl px-4 py-3 
          font-semibold gap-2 transition-all outline-none focus-within:shadow-[0px_0px_2px_2px] hover:shadow-[0px_0px_2px_2px] group"
      type="submit"
      {...props}
    >
      {Icon && (
        <Icon className=" text-primary-300 group-hover:text-primary-50" />
      )}
      {text}
    </button>
  );
}
