// @deno-types="npm:@types/ejs"
import ejs from "ejs";

export const ejsRender = (content: string, data?: ejs.Data) => {
  return ejs.render(content, data, { async: true });
};
