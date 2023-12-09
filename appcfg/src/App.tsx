import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import axios from "axios";
import { v4 as uuid } from "uuid";

const BASE_DOMAIN = window.location.host;
const BASE_URL = `http://${BASE_DOMAIN}`;

type TAgent = {
  host: string;
  port: number;
};

type TServer = {
  serial: string;
  port: number;
  name: string;
};

type TProxy = {
  origin: string;
  port: number;
  name: string;
  auto_connect: boolean;
  reconnect_inverval: number;
  alias: string;
  location: string;
};

type TSmb = {
  server: string;
  username: string;
  password: string;
  service: string;
  root: string;
  interval_in_seconds: number;
  reconnect_inverval: number;
  enabled: boolean;
};

type TCfgObj = {
  agent: TAgent;
  servers: TServer[];
  proxies: TProxy[];
  smb: TSmb;
};

type AgentSectionProps = {
  cfg: TCfgObj;
};

type ValueInputProps = {
  tabIndex?: number;
  label: string;
  value: string | number | boolean;
  type: "string" | "float" | "integer" | "ipv4" | "bool" | "password";
  onChange?: (value: any) => void;
};

function ValueInput(props: ValueInputProps) {
  var newId = uuid();

  return (
    <>
      <div className='h-full flex items-center'>
        <p className='my-0 py-0'>{props.label}</p>
      </div>
      {(() => {
        if (props.type === "bool") {
          return (
            <div className='relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in'>
              <input
                id={newId}
                tabIndex={props.tabIndex}
                className='toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer'
                type='checkbox'
                defaultChecked={props.value as boolean}
                onChange={(val) => {
                  if (props.onChange) {
                    props.onChange(val.target.checked);
                  }
                }}
              />
              <label
                className='toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer align-middle'
                htmlFor={newId}
              ></label>
            </div>
          );
        } else {
          return (
            <input
              tabIndex={props.tabIndex}
              className='shadow appearance-none border rounded w-full my-1 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
              type='text'
              defaultValue={props.value as string}
              onChange={(val) => {
                if (props.onChange) {
                  props.onChange(val.target.value);
                }
              }}
            />
          );
        }
      })()}
    </>
  );
}

type PropEditorProps = {
  baseTabIndex: number;
  title: string;
  items: ValueInputProps[] | ValueInputProps[][];
  isArray: boolean;
  setter?: (title: string, value: any, blockIdx?: number, idx?: number) => void;
  adder?: (title: string) => void;
  deleter?: (title: string, blockIdx: number) => void;
};

function PropEditor(props: PropEditorProps) {
  let arr: ValueInputProps[][] = [];
  if (!props.isArray) {
    arr.push(props.items as ValueInputProps[]);
  } else {
    arr = props.items as ValueInputProps[][];
  }

  let tabIndex = props.baseTabIndex;

  return (
    <div className='w-full'>
      <div className='bg-gray-300 mt-2 p-1'>
        <strong>{props.title}</strong>
      </div>
      {arr.map((items, blockIndx) => (
        <div className='border p-4 mt-1' key={`${blockIndx}_${items[1].value}`}>
          {props.isArray && (
            <div className='flex justify-end'>
              <button
                className='mb-1 py-1 px-2 bg-red-600 text-white text-sm rounded shadow-md hover:bg-red-700 hover:shadow-lg focus:bg-red-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-red-800 active:shadow-lg transition duration-150 ease-in-out'
                onClick={() => {
                  if (props.deleter) {
                    props.deleter(props.title, blockIndx);
                  }
                }}
              >
                Delete
              </button>
            </div>
          )}
          {items.map((item, index) => {
            tabIndex += 1;

            return (
              <div key={`${blockIndx}_${index}`} className='grid grid-cols-2'>
                <ValueInput
                  tabIndex={tabIndex}
                  label={item.label}
                  value={item.value}
                  type={item.type}
                  onChange={(val) => {
                    if (props.setter) {
                      props.setter(props.title, val, blockIndx, index);
                    }
                  }}
                />
              </div>
            );
          })}
        </div>
      ))}

      {props.isArray && (
        <button
          type='button'
          className='w-full py-2 bg-blue-600 text-white font-medium text-xs leading-tight uppercase rounded shadow-md hover:bg-blue-700 hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-blue-800 active:shadow-lg transition duration-150 ease-in-out'
          onClick={() => {
            if (props.adder) {
              props.adder(props.title);
            }
          }}
        >
          Add
        </button>
      )}
    </div>
  );
}

async function getConfObj(): Promise<TCfgObj> {
  let obj = await axios.get(`${BASE_URL}/cfg`);
  return obj.data as TCfgObj;
}

var defaultCfg: TCfgObj = {
  agent: {
    host: "0.0.0.0",
    port: 80,
  },
  servers: [],
  proxies: [],
  smb: {
    server: "",
    username: "",
    password: "",
    service: "",
    root: "",
    interval_in_seconds: 5,
    reconnect_inverval: 10,
    enabled: false,
  },
};

function Config() {
  const [cfg, setCfg] = useState<TCfgObj>(defaultCfg);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("location");
  const [filterBy, setFilterBy] = useState("");
  const [filteredProxies, setFilteredProxies] = useState<TProxy[]>([]);

  useEffect(() => {
    async function readConfig() {
      setLoading(true);
      setTimeout(async () => {
        let obj = await getConfObj();
        setCfg(obj);
        setLoading(false);
      }, 500);
    }

    readConfig();
  }, []);

  function updater(title: string, value: any, blockIdx?: number, idx?: number) {
    let obj: TCfgObj = { ...cfg };

    if (title === "Agent") {
      obj = {
        ...cfg,
        agent: {
          ...cfg.agent,
          ...(idx === 0 && { host: value as string }),
          ...(idx === 1 && { port: parseInt(value) }),
        },
      };
    } else if (title == "Servers") {
      let newServers = [...cfg.servers];
      let server = newServers[blockIdx as number];

      newServers[blockIdx as number] = {
        ...server,
        ...(idx === 0 && { name: value as string }),
        ...(idx === 1 && { serial: value as string }),
        ...(idx === 2 && { port: parseInt(value) }),
      };

      obj = {
        ...cfg,
        servers: [...newServers],
      };
    } else if (title == "Proxies") {
      let newProxies = [...cfg.proxies];
      let proxy = newProxies[blockIdx as number];

      newProxies[blockIdx as number] = {
        ...proxy,
        ...(idx === 0 && { name: value as string }),
        ...(idx === 1 && { origin: value as string }),
        ...(idx === 2 && { port: parseInt(value) }),
        ...(idx === 3 && { auto_connect: value as boolean }),
        ...(idx === 4 && { reconnect_inverval: value as number }),
        ...(idx === 5 && { alias: value as string }),
        ...(idx === 6 && { location: value as string }),
      };

      obj = {
        ...cfg,
        proxies: [...newProxies],
      };
    } else if (title == "Samba") {
      obj = {
        ...cfg,
        smb: {
          ...cfg.smb,
          ...(idx === 0 && { server: value as string }),
          ...(idx === 1 && { username: value as string }),
          ...(idx === 2 && { password: value as string }),
          ...(idx === 3 && { service: value as string }),
          ...(idx === 4 && { root: value as string }),
          ...(idx === 5 && { interval_in_seconds: parseFloat(value) }),
          ...(idx === 6 && { reconnect_inverval: parseFloat(value) }),
          ...(idx === 7 && { enabled: value as boolean }),
        },
      };
    }

    setCfg(obj);
  }

  function adder(title: string) {
    let obj: TCfgObj = { ...cfg };
    setFilterBy("");

    switch (title) {
      case "Servers":
        obj = {
          ...cfg,
          servers: [
            ...cfg.servers,
            {
              serial: "NEW_SERIAL",
              port: 0,
              name: "NEW_NAME",
            } as TServer,
          ],
        };
        break;

      case "Proxies":
        obj = {
          ...cfg,
          proxies: [
            ...cfg.proxies,
            {
              origin: "127.0.0.1:1001",
              port: 1001,
              name: "PROXY_NEW",
              auto_connect: false,
              reconnect_inverval: 10,
              location: "NEW_LOCATION",
              alias: "NEW_ALIAS",
            } as TProxy,
          ],
        };
        break;
    }

    setCfg(obj);
  }

  function deleter(title: string, blockIdx: number) {
    console.log(`deleter(title: '${title}', blockIdx: '${blockIdx}')`);

    let obj = { ...cfg };

    switch (title) {
      case "Servers":
        let newServers = [...obj.servers];
        newServers = newServers.filter((_, index) => index !== blockIdx);

        obj = {
          ...cfg,
          servers: [...newServers],
        };
        break;

      case "Proxies":
        let newProxies = [...obj.proxies];
        newProxies = newProxies.filter((_, index) => index !== blockIdx);

        obj = {
          ...cfg,
          proxies: [...newProxies],
        };
        break;
    }

    setCfg(obj);
  }

  useEffect(() => {
    const compare = (a: TProxy, b: TProxy) => {
      switch (sortBy) {
        case "location":
          return a.location.localeCompare(b.location);
        case "port":
          return a.port - b.port;
        case "name":
          return a.name.localeCompare(b.name);
        case "origin":
          return a.origin.localeCompare(b.origin);
        default:
          return 0;
      }
    };
    setCfg((prev) => ({ ...prev, proxies: prev.proxies.sort(compare) }));
  }, [sortBy]);

  useEffect(() => {
    const filter = (proxy: TProxy) => {
      if (!filterBy) return true;
      const keyword = filterBy.toLowerCase();
      const isMatch =
        proxy.location.toLowerCase().includes(keyword) ||
        proxy.name.toLowerCase().includes(keyword) ||
        proxy.origin.toLowerCase().includes(keyword) ||
        proxy.port.toString().includes(keyword);
      return isMatch;
    };
    setFilteredProxies(cfg.proxies.filter(filter));
  }, [filterBy, cfg, setFilteredProxies]);

  let lastTabIndex = 0;

  if (loading) return <div className='spinner'></div>;

  return (
    <div className='flex flex-col justify-center items-center w-1/3 m-auto'>
      <PropEditor
        isArray={false}
        title='Agent'
        baseTabIndex={lastTabIndex}
        items={[
          {
            label: "Host",
            value: cfg.agent.host,
            type: "ipv4",
          },
          {
            label: "Port",
            value: cfg.agent.port,
            type: "integer",
          },
        ]}
        setter={updater}
      />

      <PropEditor
        isArray={true}
        title='Servers'
        baseTabIndex={2}
        items={cfg.servers.map(
          (server) =>
            [
              {
                label: "Name",
                value: server.name,
                type: "string",
              },
              {
                label: "Serial",
                value: server.serial,
                type: "string",
              },
              {
                label: "Port",
                value: server.port,
                type: "integer",
              },
            ] as ValueInputProps[]
        )}
        setter={updater}
        adder={adder}
        deleter={deleter}
      />

      <div className='flex justify-between items-center w-full mt-2'>
        <div className='flex justify-between items-center gap-2 before:border-none'>
          <strong>Sort By:</strong>
          <select
            onChange={(e) => setSortBy(e.target.value)}
            className='outline-none cursor-pointer text-green-700 border-none'
          >
            <option value='location'>Location</option>
            <option value='port'>Port</option>
            <option value='name'>Name</option>
            <option value='origin'>Origin</option>
          </select>
        </div>
        <div className='flex justify-between items-center gap-2'>
          <strong className='text-sm whitespace-nowrap'>Filter By</strong>
          <input
            className='shadow appearance-none border rounded w-full py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
          ></input>
        </div>
      </div>

      <PropEditor
        isArray={true}
        title='Proxies'
        baseTabIndex={2 + cfg.servers.length * 3}
        items={filteredProxies.map(
          (proxy) =>
            [
              {
                label: "Name",
                value: proxy.name,
                type: "string",
              },
              {
                label: "Origin",
                value: proxy.origin,
                type: "string",
              },
              {
                label: "Port",
                value: proxy.port,
                type: "integer",
              },
              {
                label: "Auto Reconnect",
                value: proxy.auto_connect,
                type: "bool",
              },
              {
                label: "Reconnect Interval",
                value: proxy.reconnect_inverval,
                type: "float",
              },
              {
                label: "Alias",
                value: proxy.alias,
                type: "string",
              },
              {
                label: "Location",
                value: proxy.location,
                type: "string",
              },
            ] as ValueInputProps[]
        )}
        setter={updater}
        adder={adder}
        deleter={deleter}
      />

      <PropEditor
        isArray={false}
        title='Samba'
        baseTabIndex={2 + cfg.servers.length * 3 + cfg.proxies.length * 6}
        items={[
          {
            label: "Server",
            value: cfg.smb.server,
            type: "string",
          },
          {
            label: "Username",
            value: cfg.smb.username,
            type: "string",
          },
          {
            label: "Password",
            value: cfg.smb.password,
            type: "password",
          },
          {
            label: "Service",
            value: cfg.smb.service,
            type: "string",
          },
          {
            label: "Root",
            value: cfg.smb.root,
            type: "string",
          },
          {
            label: "Interval In Seconds",
            value: cfg.smb.interval_in_seconds,
            type: "float",
          },
          {
            label: "Reconnect",
            value: cfg.smb.reconnect_inverval,
            type: "float",
          },
          {
            label: "Enabled",
            value: cfg.smb.enabled,
            type: "bool",
          },
        ]}
        setter={updater}
      />

      <div className='my-4 flex justify-center w-full'>
        <button
          className='w-full p-2 bg-green-600 text-white rounded shadow-md hover:bg-green-700 hover:shadow-lg focus:bg-green-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-green-800 active:shadow-lg transition duration-150 ease-in-out'
          onClick={() => {
            axios.post(`${BASE_URL}/cfg`, cfg);
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
}

function Log() {
  let [isLive, setIsLive] = useState<boolean>(false);
  let [logs, setLogs] = useState<string[]>([]);
  let socket = useRef<WebSocket>();

  useEffect(() => {
    console.log("Setting up ...");
    socket.current = new WebSocket(`ws://${BASE_DOMAIN}/logging`);

    socket.current.onopen = (event) => {
      console.log("Opened");
      setIsLive(true);
    };

    socket.current.onclose = (event) => {
      console.log("Disconnected");
      setIsLive(false);
    };

    socket.current.onerror = (event) => {
      console.log("Error");
    };

    socket.current.onmessage = (event) => {
      let obj = JSON.parse(event.data);
      console.log(`App log: ${obj["message"]}`);

      setLogs((prev) => [...prev, `[${obj["type"]}]${obj["message"]}`]);
    };

    return () => socket.current!.close();
  }, []);

  return (
    <div className='w-full h-screen'>
      <p className={`p-2 ${isLive ? "text-green-500" : "text-red-500"}`}>
        Live
      </p>
      <div className='w-full h-full'>
        <div>
          <p>
            <a href={`${BASE_URL}/download-sambalog`} download={true}>
              Download samba logs
            </a>
          </p>
          <p>
            <a href={`${BASE_URL}/download-proxylog`} download={true}>
              Download proxy logs
            </a>
          </p>
          <p>
            <a href={`${BASE_URL}/download-weblog`} download={true}>
              Download web logs
            </a>
          </p>
        </div>

        <div className='border m-2'>
          <p>
            <strong>Log</strong>
          </p>
          <div className='p-2'>
            {logs.map((msg, index) => (
              <p key={index}>{msg}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<Config />} />
        <Route path='/log' element={<Log />} />
      </Routes>
    </Router>
  );
}

export default App;
