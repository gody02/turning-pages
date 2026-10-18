/** Internal root trust boundary; not a domain API or persisted schema.
 * Reflection on Proxies can trap. Captured data descriptors are the only
 * source of values; no subsequent ordinary read touches the caller graph.
 */
export function snapshotRoot<T>(value:T):T{
  try{
    // Technical protection, above the current 9.6 MB production root and 128 MiB
    // import ceiling. Shared JSON depth 40 and property-key limit 3000 stay exact.
    let values=0,text=0;const ancestors=new Set<object>();
    const visit=(item:unknown,depth:number):unknown=>{
      if(++values>16_000_000||depth>40)throw Error();
      if(typeof item==='string'){text+=item.length;if(text>256*1024*1024)throw Error();return item;}
      if(item===null||typeof item==='boolean'||typeof item==='number'&&Number.isFinite(item))return item;
      if(typeof item!=='object'||ancestors.has(item))throw Error();
      ancestors.add(item);
      const array=Array.isArray(item),prototype=Object.getPrototypeOf(item),keys=Reflect.ownKeys(item);
      if(array?prototype!==Array.prototype:prototype!==Object.prototype&&prototype!==null)throw Error();
      if(keys.length>16_000_000-values+(array?1:0))throw Error();
      const descriptors:PropertyDescriptor[]=new Array(keys.length);
      let length:number|undefined;
      for(let i=0;i<keys.length;i++){
        const key=keys[i];if(typeof key!=='string'||key.length>3000)throw Error();
        const descriptor=Object.getOwnPropertyDescriptor(item,key);
        if(!descriptor||!('value' in descriptor))throw Error();
        if(array&&key==='length'){
          if(descriptor.enumerable||descriptor.configurable||!Number.isSafeInteger(descriptor.value)||descriptor.value<0||descriptor.value>16_000_000)throw Error();
          length=descriptor.value;
        }else{
          if(!descriptor.enumerable)throw Error();
          text+=key.length;if(text>256*1024*1024)throw Error();
        }
        descriptors[i]=descriptor;
      }
      if(array&&(length===undefined||keys.length!==length+1))throw Error();
      // The destination is private and has no inherited setters while filling.
      // This makes direct data assignment safe even for __proto__/constructor,
      // without allocating a defineProperty descriptor for every copied value.
      const copy:Record<string,unknown>|unknown[]=array?new Array(length!):Object.create(null);
      if(array)Object.setPrototypeOf(copy,null);
      for(let i=0;i<keys.length;i++){
        const key=keys[i] as string;if(array&&key==='length')continue;
        if(array&&(!/^(?:0|[1-9]\d*)$/.test(key)||Number(key)>=length!||String(Number(key))!==key))throw Error();
        (copy as Record<string,unknown>)[key]=visit(descriptors[i].value,depth+1);
      }
      // Detect observable shape/descriptor changes without retrieving values.
      // A malicious Proxy cannot be authenticated; its captured data is validated.
      const finalKeys=Reflect.ownKeys(item);
      if(Object.getPrototypeOf(item)!==prototype||finalKeys.length!==keys.length||finalKeys.some((key,i)=>key!==keys[i]))throw Error();
      for(let i=0;i<keys.length;i++){
        const before=descriptors[i],after=Object.getOwnPropertyDescriptor(item,keys[i]);
        if(!after||!('value' in after)||after.enumerable!==before.enumerable||after.configurable!==before.configurable||after.writable!==before.writable||!Object.is(after.value,before.value))throw Error();
      }
      Object.setPrototypeOf(copy,array?Array.prototype:Object.prototype);
      ancestors.delete(item);return copy;
    };
    return visit(value,0) as T;
  }catch{throw Error('Invalid Game JSON snapshot.');}
}
