import React from "react";
import { Button, Card, Typography, Tooltip, Flex, Transition, Input, Modal, AutoComplete, FloatButton } from 'antd';
import { LoadingOutlined, CopyOutlined, CopyFilled, EditOutlined, EditFilled, CheckOutlined, EyeTwoTone, EyeInvisibleOutlined, MehFilled, DeleteOutlined, PlusSquareOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import Swal from 'sweetalert2';
import './App.css';
import path from 'path';

const keysJsonPath = "../data/keys.json";

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            keysByProviders: [],
            saveLoadingID: '',
            visibilityKeyID: '',
            loading: true,
            oldName: '',
            oldToken: '',
            addKeyModalVisible: false,
            addProvider: '',
            addName: '',
            addToken: '',
            newName: '',
            newToken: '',
            deletingKeyID: '',
        };
    }

    componentDidMount() {
        window.electron.receive('read-keys-reply', (data) => {
            // parse the json file
            this.setState({ keysByProviders: JSON.parse(data) });
            this.setState({ loading: false, saveLoadingID: ''});
        });
    
        // Add a new event listener for 'save-key-success'
        window.electron.receive('save-key-success', ({ provider, oldName, newName, newToken }) => {
            // update the keysByProviders state
            window.electron.send('read-keys');
            // alert the user of the success
            Swal.fire({
                icon: "success",
                title: "Saved!",
                toast: true,
                animation: false,
                position: "top-end",
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                didOpen: (toast) => {
                toast.onmouseenter = Swal.stopTimer;
                toast.onmouseleave = Swal.resumeTimer;
                },
            })
        });

        // Add a new event listener for 'save-key-error'
        window.electron.receive('save-key-error', ({ provider, oldName, newName, oldToken, newToken, error }) => {
            // reset states
            this.setState({
                saveLoadingID: '',
                loading: false,
                addKeyModalVisible: false,
                oldName: '',
                oldToken: '',
                newName: '',
                newToken: '',
            })
            //  alert the user of the error
            Swal.fire({
                icon: 'error', 
                iconColor: '#000000', //black
                title: 'Oops...',
                color: '#000000', //black
                text:  `${error}`,
                showConfirmButton: true,
                confirmButtonText: 'Ok',
                confirmButtonColor: '#000000', //black
            })
        })

        // Add a new event listener for 'delete-key-success'
        window.electron.receive('delete-key-success', ({ provider, name }) => {
            // set the deletingKeyID to fade out
            this.setState({ deletingKeyID: provider + '-' + name });

            // Remove the provider and name of the key card from the keysByProviders state 500ms after the fade out animation ends
            // Remove the provider if 0 keys
            setTimeout(() => {
                this.setState((prevState) => {
                    const updatedKeysByProviders = prevState.keysByProviders.map((providerObj) => {
                        if (providerObj.Provider === provider) {
                            return {
                                ...providerObj,
                                keys: providerObj.keys.filter((key) => key.name !== name),
                            };
                        }
                        return providerObj;
                    });

                    // Remove the provider if it has 0 keys
                    const finalKeysByProviders = updatedKeysByProviders.filter((providerObj) => providerObj.keys.length > 0);
                    return {
                        keysByProviders: finalKeysByProviders,
                        deletingKeyID: '',
                    };
                });
            }, 500); // 500ms delay
        });
        
        // Add a new event listener for 'delete-key-error'
        window.electron.receive('delete-key-error', ({ provider, name, error }) => {
            // reset states
            this.setState({
                deletingKeyID: '',
            })
            //  alert the user of the error
            Swal.fire({
                icon: 'error', 
                iconColor: '#000000', //black
                title: 'Oops...',
                color: '#000000', //black
                text:  `${error}`,
                showConfirmButton: true,
                confirmButtonText: 'Ok',
                confirmButtonColor: '#000000', //black
            })
        })

        // Add a new event listener for 'add-key-success'
        window.electron.receive('add-key-success', ({ provider, name, token }) => {
            // set the addKeyModalVisible to false
            // the new provider, name, and token should be ''
            this.setState({ 
                addKeyModalVisible: false,
                addProvider: '',
                addName: '',
                addToken: '',
             }, () => {
                // read the keys from the json file
                window.electron.send('read-keys');
            }); 
            // alert the user of the success
            Swal.fire({
                icon: "success",
                title: "Added!",
                toast: true,
                animation: false,
                position: "top-end",
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                didOpen: (toast) => {
                    toast.onmouseenter = Swal.stopTimer;
                    toast.onmouseleave = Swal.resumeTimer;
                },
            })
        });

        // Add a new event listener for 'add-key-error'
        window.electron.receive('add-key-error', ({ provider, name, token, error }) => {
            //  alert the user of the error
            Swal.fire({
                icon: 'error', 
                iconColor: '#000000', //black
                title: 'Oops...',
                color: '#000000', //black
                text:  `${error}`,
                showConfirmButton: true,
                confirmButtonText: 'Ok',
                confirmButtonColor: '#000000', //black
            })
        })


        // read the keys from the json file
        window.electron.send('read-keys')
    }
    
    addKey(provider, name, token) {
        // check if the provider, name, and token are empty
        if (provider === '' || name === '' || token === '') {
            Swal.fire({
                icon: 'error', 
                iconColor: '#000000', //black
                title: 'Oops...',
                color: '#000000', //black
                text:  'Please fill in all fields.',
                showConfirmButton: true,
                confirmButtonText: 'Ok',
                confirmButtonColor: '#000000', //black
            })
            return;
        } else {
            // send the provider, name, and token to the main process
            window.electron.send('add-key', { provider, name, token });
        }
    }

    saveKey(provider, oldName, newName, oldToken, newToken) {
        // send the new name and token to the main process
        window.electron.send('save-key', { provider, oldName, newName, oldToken, newToken });
    }

    deleteKey(provider, name) {
        // send the new name and token to the main process
        window.electron.send('delete-key', { provider, name });
    }

    render() {
        
        return (
            <body>
                
                <div>
                            <FloatButton className="add-key-button" 
                                    type="primary" 
                                    size="large" 
                                    shape="circle"
                                    onClick={() => {
                                                // open a modal to add a new key
                                                this.setState({ addKeyModalVisible: true });
                                            }}
                                    icon={<PlusSquareOutlined />}
                                    >
                            </FloatButton>
                            <Modal
                                title="Add a new key"
                                centered
                                open={this.state.addKeyModalVisible}
                                okText="Save"
                                onOk={() => {
                                    this.addKey(this.state.addProvider, this.state.addName, this.state.addToken);
                                }}
                                cancelText="Cancel"
                                onCancel={() => {this.setState({
                                                    addKeyModalVisible: false,
                                                    addProvider: '',
                                                    addName: '',
                                                    addToken: '',
                                                })}}
                                >
                                    {/* Input for the provider, name, and token */}
                                            
                                    <Flex direction="column" justify="center" align="center">
                                        <AutoComplete 
                                            placeholder="Provider"
                                            value={this.state.addProvider}
                                            // options are previouse providers
                                            options={this.state.keysByProviders.map(providerObj => ({ value: providerObj.Provider }))}
                                            style={{margin: '10px', minWidth: '100px'}}
                                            onChange={(value) => {
                                                this.setState({ addProvider: value });
                                              }}
                                        />
                                        <Input 
                                            placeholder="Name" 
                                            value={this.state.addName}
                                            onChange={(e) => {this.setState({ addName: e.target.value })}}
                                            style={{margin: '10px'}}
                                        />
                                        <Input.Password 
                                            placeholder="Token" 
                                            value={this.state.addToken}
                                            onChange={(e) => {this.setState({ addToken: e.target.value })}}
                                            style={{margin: '10px'}}
                                        />
                                    </Flex>
                            </Modal> 
                </div> 
                
                {/* The following is a list of your llm service keys */}
                <div className="card-container">
                        {/* contains all the card elements */}

                        { this.state.loading ? 
                        // if it is loading
                        <Spin indicator={<LoadingOutlined style={{ fontSize: 24, marginTop: "50vh"}} spin />} /> 
                        
                        :  
                            // if loading is false

                                  

                            this.state.keysByProviders.map((provider) => (
                                <Card   
                                        title={provider.Provider} 
                                        bordered={true}
                                        loading={this.state.loading}
                                        style={{
                                            width: '90%',
                                            minWidth: '500px',
                                            maxWidth: '1000px',
                                            height: 'auto',
                                            margin: '5%',
                                            border: '5px solid transparent',
                                            borderRadius: '25px',
                                            backgroundColor: 'white',
                                            boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)',
                                            // if 0 keys, fade out the card
                                            opacity: provider.keys.length === 0 ? 0 : 1,
                                            // add a transition when deleting the card
                                            transition: 'opacity 0.5s ease-in-out'
                                        }}
                                        >


                                    <div className="inner-content">
                                        {/* contains all the key elements */}
                                        {provider.keys.map((key) => (
                                            <Card.Grid  
                                                        id={provider.Provider + '-' + key.name}
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            margin: '10px 0',
                                                            width: '100%',
                                                            border: '1px solid grey',
                                                            borderRadius: '25px',
                                                            display: 'block',
                                                            // add a transition when deleting the key
                                                            opacity: this.state.deletingKeyID === provider.Provider + '-' + key.name ? 0 : 1,
                                                            transition: 'opacity 0.5s ease-in-out',
                                                        }} 
                                                        >
                                                    { this.state.saveLoadingID === provider.Provider + '-' + key.name ?

                                                        <Spin indicator={<LoadingOutlined style={{ fontSize: 24, marginLeft: "50%"}} spin />} />

                                                        :

                                                        (<div>
                                                            <div className="key-name-container">
                                                            
                                                                <Typography.Paragraph                                                        
                                                                    style={{
                                                                        margin: '10px',
                                                                        minWidth: '100px',
                                                                        border: '1px solid transparent',
                                                                        borderRadius: '10px',
                                                                    }}

                                                                    className="hoverable-paragraph"
                                                                    autoSize={true}
                                                                    editable={{
                                                                        onStart: async () => {
                                                                            await new Promise((resolve) => {
                                                                                this.setState({
                                                                                    oldName: key.name,
                                                                                    oldToken: key.token,
                                                                                }, resolve);
                                                                            });
                                                                        },
                                                                        
                                                                        onChange: (newName) => {
                                                                            this.setState({
                                                                                newName: newName,
                                                                            });
                                                                        },
                                                                        
                                                                        onEnd: () => {
                                                                            this.setState({
                                                                                saveLoadingID: provider.Provider + '-' + key.name
                                                                            })

                                                                            this.setState(prevState => {
                                                                                this.saveKey(provider.Provider, prevState.oldName, prevState.newName, prevState.oldToken, key.token);
                                                                            });
                                                                        },
                                                                    }}
                                                                    copyable={{
                                                                        icon: [
                                                                            <CopyOutlined style={{ float: 'right' }} key="copy-icon" />, 
                                                                            <CheckOutlined style={{ float: 'right' }} key="check-icon" />                                 
                                                                        ],
                                                                        tooltips: ['Copy', 'Copied!'],
                                                                    }}  
                                                                >
                                                                    {key.name}

                                                                    
                                                                                                                                
                                                                </Typography.Paragraph>
                                                            
                                                            </div>
                                                            <div className="key-container"> 
                                                            
                                                                
                                                                    <Typography.Paragraph 
                                                                        style={{
                                                                            margin: '10px',
                                                                            minWidth: '100px',
                                                                            width: '100%',
                                                                            border: '1px solid transparent',
                                                                            
                                                                        }}
                                                                        className="hoverable-paragraph"
                                                                        autoSize={true}
                                                                        editable={{
                                                                            
                                                                            text: key.token,

                                                                            onStart: async () => {
                                                                                await new Promise((resolve) => {
                                                                                    this.setState({
                                                                                        oldName: key.name,
                                                                                        oldToken: key.token,
                                                                                    }, resolve);
                                                                                });
                                                                            },
                                                                            
                                                                            onChange: (newToken) => {
                                                                                this.setState({
                                                                                    newToken: newToken,
                                                                                });
                                                                            },
                                                                            
                                                                            onEnd: () => {
                                                                                this.setState({
                                                                                    saveLoadingID: provider.Provider + '-' + key.name
                                                                                })

                                                                                this.setState(prevState => {
                                                                                    this.saveKey(provider.Provider, key.name, key.name, prevState.oldToken, prevState.newToken);
                                                                                });
                                                                            },
                                                                        }}
                                                                        copyable={{

                                                                            text: key.token,

                                                                            icon: [
                                                                                <CopyOutlined style={{  }} key="copy-icon" />, 
                                                                                <CheckOutlined style={{  }} key="check-icon" />                                 
                                                                            ],
                                                                            tooltips: ['Copy', 'Copied!'],
                                                                        }}
                                                                    >

                                                                        
                                                                            {this.state.visibilityKeyID === provider.Provider + '-' + key.name ? key.token : '•'.repeat(key.token.length)}
                                                                            <Tooltip title="Toggle visibility">
                                                                                <Button 
                                                                                    onClick={() => {
                                                                                                    // if the visibilityKeyID is the same as the current key, set it to an empty string
                                                                                                    if (this.state.visibilityKeyID === provider.Provider + '-' + key.name) {
                                                                                                        this.setState({ visibilityKeyID: '' });
                                                                                                    } else {
                                                                                                        this.setState({ visibilityKeyID: provider.Provider + '-' + key.name });
                                                                                                    }
                                                                                                }
                                                                                            }
                                                                                    icon={this.state.visibilityKeyID === provider.Provider + '-' + key.name ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
                                                                                    type="circle"
                                                                                    style={{ marginLeft: '0px', marginRight: '10px'}}
                                                                                    size="small"
                                                                                >
                                                                                </Button>
                                                                            </Tooltip>
                                                                        

                                                                    </Typography.Paragraph>
                                                            
                                                            </div>
                                                            <div className="button-container"> 
                                                                <Button 
                                                                    className="delete-button"
                                                                    onClick={()=>{
                                                                        // use Swal to confirm the deletion
                                                                        Swal.fire({
                                                                            title: 'Are you sure?',
                                                                            color: '#000000',
                                                                            text: `Are you sure you want to delete the key ` + key.name + ` for ` + provider.Provider + `?`,
                                                                            icon: 'warning',
                                                                            iconColor: '#000000',
                                                                            showConfirmButton: true,
                                                                            confirmButtonText: 'Yes, delete it!',
                                                                            confirmButtonColor: '#000000',  //black
                                                                            showCancelButton: true,
                                                                            cancelButtonText: 'No, keep it',
                                                                            cancelButtonColor: '#808080', //grey
                                                                        }).then((result) => {
                                                                            if (result.isConfirmed) {
                                                                                // if the user confirms, delete the key
                                                                                this.deleteKey(provider.Provider, key.name);
                                                                            } else {
                                                                                // if the user denies, do nothing
                                                                            }
                                                                        }) 
                                                                    }}
                                                                    icon={<DeleteOutlined />}
                                                                    size="small"
                                                                    danger 
                                                                    >
                                                                </Button>
                                                            </div>
                                                        </div>)
                                                    
                                                    }
                                            </Card.Grid>
                                        ))}   
                                    </div>
                                </Card>
                            ))  
                        }
                </div>
            </body>
        );
    }
}

export default App;