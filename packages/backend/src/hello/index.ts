const me = "Chris";
export const hello = () => {
  console.log("Returning from shared package!");
  return `Hello ${me} from shared package!`;
};
