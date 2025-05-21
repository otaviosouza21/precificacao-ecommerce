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
      className=" text-primary-300 w-full justify-center bg-green-600  active:bg-primary-500 text-md focus-within:border-emerald-700
         hover:bg-emerald-500  hover:text-primary-50 focus:bg-primary-300/90 
          flex cursor-pointer  rounded-2xl px-4 py-3 
          font-semibold gap-2 transition-all outline-none  group"
      type="submit"
      {...props}
    >
      {Icon && (
        <Icon className="text-primary-300 group-hover:text-primary-50" />
      )}
      {text}
    </button>
  );
}
