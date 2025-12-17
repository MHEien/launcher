use super::host_api::{DefaultHostApi, PluginHostApi, PluginSearchResult};
use super::manifest::LoadedPlugin;
use parking_lot::RwLock;
use std::collections::HashMap;
use std::sync::Arc;
use wasmtime::*;

pub struct PluginRuntime {
    engine: Engine,
    instances: RwLock<HashMap<String, PluginInstance>>,
    host_api: Arc<dyn PluginHostApi>,
}

struct PluginInstance {
    _module: Module,
    store: Store<PluginState>,
    instance: Instance,
}

struct PluginState {
    plugin_id: String,
    host_api: Arc<dyn PluginHostApi>,
}

impl PluginRuntime {
    pub fn new() -> Result<Self, String> {
        let engine = Engine::default();

        Ok(Self {
            engine,
            instances: RwLock::new(HashMap::new()),
            host_api: Arc::new(DefaultHostApi::new()),
        })
    }

    pub fn load_plugin(&self, plugin: &LoadedPlugin) -> Result<(), String> {
        let module = Module::new(&self.engine, &plugin.wasm_bytes)
            .map_err(|e| format!("Failed to compile WASM module: {}", e))?;

        let mut store = Store::new(
            &self.engine,
            PluginState {
                plugin_id: plugin.manifest.id.clone(),
                host_api: self.host_api.clone(),
            },
        );

        let mut linker = Linker::new(&self.engine);

        self.register_host_functions(&mut linker)?;

        let instance = linker
            .instantiate(&mut store, &module)
            .map_err(|e| format!("Failed to instantiate WASM module: {}", e))?;

        if let Some(init) = instance.get_func(&mut store, "init") {
            init.call(&mut store, &[], &mut [])
                .map_err(|e| format!("Plugin init failed: {}", e))?;
        }

        let plugin_instance = PluginInstance {
            _module: module,
            store,
            instance,
        };

        let mut instances = self.instances.write();
        instances.insert(plugin.manifest.id.clone(), plugin_instance);

        Ok(())
    }

    fn register_host_functions(&self, linker: &mut Linker<PluginState>) -> Result<(), String> {
        linker
            .func_wrap("env", "host_log", |mut caller: Caller<'_, PluginState>, ptr: i32, len: i32| {
                let mem = caller.get_export("memory").and_then(|e| e.into_memory());
                if let Some(memory) = mem {
                    let data = memory.data(&caller);
                    if let Some(slice) = data.get(ptr as usize..(ptr + len) as usize) {
                        if let Ok(message) = std::str::from_utf8(slice) {
                            let state = caller.data();
                            state.host_api.log(&state.plugin_id, "info", message);
                        }
                    }
                }
            })
            .map_err(|e| format!("Failed to register host_log: {}", e))?;

        Ok(())
    }

    pub fn call_search(&self, plugin_id: &str, query: &str) -> Result<Vec<PluginSearchResult>, String> {
        let mut instances = self.instances.write();
        let instance = instances
            .get_mut(plugin_id)
            .ok_or_else(|| format!("Plugin not loaded: {}", plugin_id))?;

        let search_fn = instance
            .instance
            .get_func(&mut instance.store, "search")
            .ok_or("Plugin does not export 'search' function")?;

        let alloc_fn = instance
            .instance
            .get_func(&mut instance.store, "alloc")
            .ok_or("Plugin does not export 'alloc' function")?;

        let memory = instance
            .instance
            .get_memory(&mut instance.store, "memory")
            .ok_or("Plugin does not export 'memory'")?;

        let query_bytes = query.as_bytes();
        let query_len = query_bytes.len() as i32;

        let mut alloc_result = [Val::I32(0)];
        alloc_fn
            .call(&mut instance.store, &[Val::I32(query_len)], &mut alloc_result)
            .map_err(|e| format!("Failed to allocate memory: {}", e))?;

        let query_ptr = alloc_result[0].unwrap_i32();

        memory
            .write(&mut instance.store, query_ptr as usize, query_bytes)
            .map_err(|e| format!("Failed to write query to memory: {}", e))?;

        let mut search_result = [Val::I32(0)];
        search_fn
            .call(
                &mut instance.store,
                &[Val::I32(query_ptr), Val::I32(query_len)],
                &mut search_result,
            )
            .map_err(|e| format!("Search call failed: {}", e))?;

        Ok(vec![])
    }

    pub fn unload_plugin(&self, plugin_id: &str) -> Result<(), String> {
        let mut instances = self.instances.write();

        if let Some(mut instance) = instances.remove(plugin_id) {
            if let Some(shutdown) = instance.instance.get_func(&mut instance.store, "shutdown") {
                let _ = shutdown.call(&mut instance.store, &[], &mut []);
            }
        }

        Ok(())
    }

    pub fn is_loaded(&self, plugin_id: &str) -> bool {
        let instances = self.instances.read();
        instances.contains_key(plugin_id)
    }

    pub fn loaded_plugin_ids(&self) -> Vec<String> {
        let instances = self.instances.read();
        instances.keys().cloned().collect()
    }
}
